// Trend graph of the patient's drug levels and the pump infusion rates.
//   Ce (effect site)  solid line
//   Cp (plasma)       dashed line
//   Rate              stepped line in its own panel underneath, in mL/h
// Drugs measured in mcg/mL use the left axis, drugs in ng/mL the right axis.

export const DRUG_COLORS = {
  propofol: '#ffd84d',
  remifentanil: '#6cb6ff',
  sufentanil: '#b39bff',
  dexmedetomidine: '#ffab66',
  ketamine: '#7ee0a0',
};
const LEFT_AXIS = ['propofol', 'ketamine'];
const NICE = [0.5, 1, 2, 4, 6, 8, 10, 15, 20, 30, 50, 100, 150, 200, 300, 500, 1000, 1500];
const niceMax = (v) => NICE.find((n) => n >= v * 1.1) ?? Math.ceil(v * 1.1);
const GRID = '#2a3541';
const TEXT = '#9aa7b4';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{t:number, ce:object, cp?:object, rate?:object}[]} history
 * @param {{cp:boolean, ce:boolean, rate:boolean}} show  which lines to draw
 */
export function drawTrend(canvas, history, show = { cp: true, ce: true, rate: true }) {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.font = '12px system-ui, sans-serif';

  const drugs = [...new Set(history.flatMap((p) => Object.keys(p.ce)))];
  const showConc = show.cp || show.ce;
  const pad = { l: 36, r: 36, t: 24, b: 22 };
  const w = width - pad.l - pad.r;
  const fullH = height - pad.t - pad.b;
  const gap = 26;
  // Concentrations on top; the rate panel takes the lower third when both are shown.
  const rateH = show.rate ? (showConc ? Math.round(fullH * 0.32) : fullH) : 0;
  const concH = showConc ? fullH - (show.rate ? rateH + gap : 0) : 0;
  const rateTop = pad.t + (showConc ? concH + gap : 0);

  const t0 = history[0]?.t ?? 0;
  const t1 = Math.max(t0 + 600, history.at(-1)?.t ?? 0);
  const x = (t) => pad.l + ((t - t0) / (t1 - t0)) * w;

  const gridLines = (top, h, rows, labelLeft, labelRight) => {
    ctx.strokeStyle = GRID;
    ctx.fillStyle = TEXT;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let i = 0; i <= rows; i++) {
      const gy = top + (h * i) / rows;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + w, gy);
      ctx.stroke();
      const frac = (rows - i) / rows;
      if (labelLeft != null) {
        ctx.textAlign = 'right';
        ctx.fillText(String(Number((labelLeft * frac).toFixed(2))), pad.l - 5, gy + 4);
      }
      if (labelRight != null) {
        ctx.textAlign = 'left';
        ctx.fillText(String(Number((labelRight * frac).toFixed(2))), pad.l + w + 5, gy + 4);
      }
    }
  };

  const line = (drug, pick, y, { dashed = false, stepped = false } = {}) => {
    ctx.strokeStyle = DRUG_COLORS[drug] ?? '#fff';
    ctx.lineWidth = dashed ? 1.5 : 2;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    let last = null;
    for (const p of history) {
      const v = pick(p);
      if (v == null) continue;
      const px = x(p.t);
      const py = y(v);
      if (last == null) ctx.moveTo(px, py);
      else {
        if (stepped) ctx.lineTo(px, last);
        ctx.lineTo(px, py);
      }
      last = py;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // ---------- concentrations ----------
  if (showConc) {
    const max = { left: 0, right: 0 };
    for (const p of history) {
      for (const drug of drugs) {
        const side = LEFT_AXIS.includes(drug) ? 'left' : 'right';
        if (show.ce) max[side] = Math.max(max[side], p.ce[drug] ?? 0);
        if (show.cp) max[side] = Math.max(max[side], p.cp?.[drug] ?? 0);
      }
    }
    const top = { left: niceMax(max.left || 4), right: niceMax(max.right || 4) };
    gridLines(pad.t, concH, 4, top.left, top.right);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText('mcg/mL', 2, 12);
    ctx.textAlign = 'right';
    ctx.fillText('ng/mL', width - 2, 12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t - 2, w, concH + 4);
    ctx.clip();
    for (const drug of drugs) {
      const side = LEFT_AXIS.includes(drug) ? 'left' : 'right';
      const y = (v) => pad.t + concH - (v / top[side]) * concH;
      if (show.cp) line(drug, (p) => p.cp?.[drug], y, { dashed: true });
      if (show.ce) line(drug, (p) => p.ce[drug], y);
    }
    ctx.restore();
  }

  // ---------- infusion rate ----------
  if (show.rate) {
    const rates = history.flatMap((p) => Object.values(p.rate ?? {})).filter((v) => v > 0).sort((a, b) => a - b);
    const peak = rates.at(-1) ?? 0;
    const median = rates[Math.floor(rates.length / 2)] ?? 0;
    // Induction boluses are far above the maintenance rate; cut them off so
    // that the maintenance rate stays readable.
    const top = niceMax(Math.min(peak, median * 3) || 100);
    const cut = peak > top;
    gridLines(rateTop, rateH, 2, top, null);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(`Rate mL/h${cut ? ' (bolus peaks cut off)' : ''}`, pad.l + 4, rateTop - 6);
    const y = (v) => rateTop + rateH - (Math.min(v, top) / top) * rateH;
    for (const drug of drugs) line(drug, (p) => p.rate?.[drug], y, { stepped: true });
  }

  // ---------- time axis ----------
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center';
  const minutes = (t1 - t0) / 60;
  const every = [1, 2, 5, 10, 15, 30, 60].find((m) => minutes / m <= 8) ?? 120;
  for (let m = Math.ceil(t0 / 60 / every) * every; m <= t1 / 60; m += every) {
    ctx.fillText(`${m} min`, Math.min(x(m * 60), width - 20), height - 6);
  }

  // ---------- legend ----------
  let legendX = pad.l + 44;
  ctx.textAlign = 'left';
  for (const drug of drugs) {
    ctx.fillStyle = DRUG_COLORS[drug] ?? '#fff';
    ctx.fillText(drug, legendX, 12);
    legendX += ctx.measureText(drug).width + 14;
  }
  if (drugs.length && showConc) {
    const key = [show.ce && 'solid = Ce', show.cp && 'dashed = Cp'].filter(Boolean).join(', ');
    ctx.fillStyle = TEXT;
    if (legendX + ctx.measureText(key).width < width - 50) ctx.fillText(key, legendX, 12);
  }
  if (!drugs.length || (!showConc && !show.rate)) {
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(drugs.length ? 'Tick Cp, Ce or Rate to show a line' : 'No drug given yet', pad.l + w / 2, pad.t + fullH / 2);
  }
}
