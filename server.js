// Local web server for the TIVA simulator. No dependencies.
// Run with:  npm start   then open http://localhost:8080
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
//
// The simulation runs here. Each room code ("station") has its own patient and
// pumps. Screens receive the state as a live stream and send actions back:
//   GET  /api/events?s=CODE   live state (server-sent events)
//   POST /api/action?s=CODE   one action as JSON, e.g. {"type":"pumpKey","pump":1,"key":"OK"}
//   GET  /api/log?s=CODE      the case log as a CSV file
//   GET  /api/info            addresses other devices can use, and open stations
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Station } from './src/sim/station.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const MAX_STATIONS = 12;
const TICK_MS = 50;

// URL prefix -> folder on disk
const MOUNTS = [
  ['/engine/', join(ROOT, 'src', 'engine')],
  ['/', join(ROOT, 'public')],
];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ---------- stations ----------

const rooms = new Map(); // code -> { station, clients:Set<response>, debt }

function room(code) {
  const id = String(code || '1').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || '1';
  if (!rooms.has(id)) {
    if (rooms.size >= MAX_STATIONS) throw new Error('Too many stations are open');
    rooms.set(id, { station: new Station(id), clients: new Set(), debt: 0 });
  }
  return rooms.get(id);
}

function broadcast(r) {
  r.sentAt = Date.now();
  if (!r.clients.size) return;
  const message = `data: ${JSON.stringify(r.station.state())}\n\n`;
  for (const res of r.clients) res.write(message);
}

// Simulated time: each station advances `speed` simulated seconds per real second.
setInterval(() => {
  for (const r of rooms.values()) {
    if (r.station.paused) continue;
    r.debt += (TICK_MS / 1000) * r.station.speed;
    let ticked = false;
    while (r.debt >= 1) {
      r.debt -= 1;
      ticked = true;
      try {
        r.station.tick();
      } catch (err) {
        // Never let one station's fault stop the others during a workshop.
        console.error(`Station ${r.station.id}: ${err.stack ?? err}`);
        r.station.paused = true;
        r.station.note(`Simulator fault, paused: ${err.message}`);
        break;
      }
    }
    // At high speed several simulated seconds pass per real second; four
    // screen updates a second is plenty and keeps tablets responsive.
    if (ticked && Date.now() - (r.sentAt ?? 0) >= 240) broadcast(r);
  }
}, TICK_MS);

// ---------- http ----------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 20000) reject(new Error('Request too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(`http://${net.address}:${PORT}`);
    }
  }
  return out;
}

async function api(req, res, url) {
  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ addresses: lanAddresses(), stations: [...rooms.keys()] }));
    return;
  }
  const r = room(url.searchParams.get('s'));
  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(r.station.state())}\n\n`);
    r.clients.add(res);
    req.on('close', () => r.clients.delete(res));
    return;
  }
  if (url.pathname === '/api/action' && req.method === 'POST') {
    r.station.action(JSON.parse(await readBody(req)));
    broadcast(r);
    res.writeHead(204).end();
    return;
  }
  if (url.pathname === '/api/log' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tiva-case-log-station-${r.station.id}.csv"`,
    });
    res.end(r.station.logCsv());
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    try {
      await api(req, res, url);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(err.message);
    }
    return;
  }
  try {
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const [prefix, dir] = MOUNTS.find(([p]) => path.startsWith(p));
    const file = normalize(join(dir, path.slice(prefix.length)));
    if (file !== dir && !file.startsWith(dir + sep)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`TIVA simulator running at http://localhost:${PORT}`);
  for (const address of lanAddresses()) console.log(`Other devices on this network: ${address}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`The simulator is already running on port ${PORT}. Use that one, or stop it first (Ctrl+C in its terminal).`);
    console.error(`To run a second copy, choose another port:  PORT=8081 npm start`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
