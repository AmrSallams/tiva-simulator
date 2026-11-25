// Builds docs/SOURCE-CODE.md and docs/SOURCE-CODE.html: every source file of
// the simulator in one document. Run with:  npm run docs:code
// FOR EDUCATION ONLY. NOT FOR CLINICAL USE.
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'docs');
const SKIP_DIRS = new Set(['node_modules', '.claude', '.git', 'docs']);
const SKIP_FILES = new Set(['.DS_Store']);
const LANG = { '.js': 'javascript', '.css': 'css', '.html': 'html', '.json': 'json', '.md': 'markdown' };

// Order of sections in the document, then alphabetical within each.
const GROUPS = [
  ['Project files', (p) => !p.includes('/')],
  ['Simulation engine (src/engine)', (p) => p.startsWith('src/engine/')],
  ['Simulation model (src/sim)', (p) => p.startsWith('src/sim/')],
  ['Web pages (public/*.html)', (p) => /^public\/[^/]+\.html$/.test(p)],
  ['Styles (public/css)', (p) => p.startsWith('public/css/')],
  ['Browser code (public/js)', (p) => p.startsWith('public/js/')],
  ['Tests (test)', (p) => p.startsWith('test/')],
  ['Tools (tools)', (p) => p.startsWith('tools/')],
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...(await walk(join(dir, entry.name))));
    } else if (!SKIP_FILES.has(entry.name) && LANG[extname(entry.name)]) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const anchor = (p) => 'file-' + p.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const paths = (await walk(ROOT)).map((f) => relative(ROOT, f).split(sep).join('/')).sort();
const files = [];
for (const path of paths) {
  const text = (await readFile(join(ROOT, path), 'utf8')).replace(/\s+$/, '') + '\n';
  files.push({ path, text, lines: text.split('\n').length - 1, lang: LANG[extname(path)] });
}
const sections = GROUPS.map(([title, test]) => ({ title, files: files.filter((f) => test(f.path)) })).filter((s) => s.files.length);
const missing = files.filter((f) => !sections.some((s) => s.files.includes(f)));
if (missing.length) sections.push({ title: 'Other files', files: missing });
const total = files.reduce((n, f) => n + f.lines, 0);
const date = new Date().toISOString().slice(0, 10);

// ---------- Markdown ----------
const fence = (text) => '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
let md = `# TIVA Simulator: Source Code\n\n`;
md += `Version ${pkg.version} · generated ${date} · ${files.length} files · ${total.toLocaleString('en-GB')} lines\n\n`;
md += `> **For education only. Not for clinical use.** This simulator must never be used to guide real drug dosing.\n\n`;
md += `## How to rebuild the project from this document\n\n`;
md += `1. Install Node.js 18 or newer. No other packages are needed.\n`;
md += `2. Create each file below at the path shown in its heading, with exactly the content in its code block.\n`;
md += `3. Run \`npm test\` to check the engine, then \`npm start\` and open http://localhost:8080.\n\n`;
md += `## Contents\n\n`;
for (const s of sections) {
  md += `- **${s.title}**\n`;
  for (const f of s.files) md += `  - [${f.path}](#${anchor(f.path)}) (${f.lines} lines)\n`;
}
md += `\n## File tree\n\n\`\`\`text\n${files.map((f) => f.path.padEnd(34) + String(f.lines).padStart(6) + ' lines').join('\n')}\n\`\`\`\n`;
for (const s of sections) {
  md += `\n## ${s.title}\n`;
  for (const f of s.files) {
    const fc = fence(f.text);
    md += `\n<a id="${anchor(f.path)}"></a>\n\n### ${f.path}\n\n${fc}${f.lang}\n${f.text}${fc}\n`;
  }
}

// ---------- printable HTML ----------
let html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TIVA Simulator Source Code</title>
<style>
  :root { --bg: #fff; --ink: #1b2026; --dim: #5b6670; --line: #d5dbe1; --code: #f5f7f9; --accent: #1d5fa8; }
  @media (prefers-color-scheme: dark) { :root { --bg: #11161c; --ink: #e6edf3; --dim: #9aa7b4; --line: #2b3540; --code: #181f27; --accent: #6cb2ff; } }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 1000px; padding: 24px 16px 64px; background: var(--bg); color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 28px; margin: 0 0 4px; } h2 { font-size: 20px; margin: 40px 0 8px; border-bottom: 2px solid var(--line); padding-bottom: 4px; }
  h3 { font-size: 15px; margin: 28px 0 6px; font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--accent); }
  .meta { color: var(--dim); margin: 0 0 16px; }
  .warn { border-left: 4px solid #c0392b; padding: 8px 12px; background: var(--code); }
  a { color: var(--accent); }
  ul { padding-left: 20px; } li small { color: var(--dim); }
  pre { margin: 0; padding: 10px 0; background: var(--code); border: 1px solid var(--line); border-radius: 6px;
    overflow-x: auto; font: 12px/1.45 ui-monospace, "SF Mono", Menlo, Consolas, monospace; counter-reset: ln; }
  pre span { display: block; padding: 0 12px 0 0; white-space: pre; }
  pre span::before { counter-increment: ln; content: counter(ln); display: inline-block; width: 3.5em; padding-right: 1em;
    text-align: right; color: var(--dim); opacity: .6; user-select: none; }
  @media print {
    :root { --bg: #fff; --ink: #000; --dim: #555; --line: #bbb; --code: #fff; --accent: #000; }
    body { max-width: none; padding: 0; font-size: 11pt; }
    h2 { break-before: page; } h3 { break-after: avoid; }
    pre { overflow: visible; border: 0; font-size: 8pt; }
    pre span { white-space: pre-wrap; word-break: break-all; break-inside: avoid; }
    a { text-decoration: none; }
  }
</style></head><body>
<h1>TIVA Simulator: Source Code</h1>
<p class="meta">Version ${esc(pkg.version)} · generated ${date} · ${files.length} files · ${total.toLocaleString('en-GB')} lines</p>
<p class="warn"><b>For education only. Not for clinical use.</b> This simulator must never be used to guide real drug dosing.</p>
<h2 style="break-before:auto">How to rebuild the project</h2>
<ol><li>Install Node.js 18 or newer. No other packages are needed.</li>
<li>Create each file below at the path shown in its heading, with exactly the content shown.</li>
<li>Run <code>npm test</code>, then <code>npm start</code> and open http://localhost:8080.</li></ol>
<p>To make a PDF, open this page in a browser and choose Print, then Save as PDF.</p>
<h2 style="break-before:auto">Contents</h2>
${sections.map((s) => `<p><b>${esc(s.title)}</b></p><ul>${s.files.map((f) => `<li><a href="#${anchor(f.path)}">${esc(f.path)}</a> <small>${f.lines} lines</small></li>`).join('')}</ul>`).join('\n')}
`;
for (const s of sections) {
  html += `<h2>${esc(s.title)}</h2>\n`;
  for (const f of s.files) {
    const body = f.text.replace(/\n$/, '').split('\n').map((l) => `<span>${esc(l) || ' '}</span>`).join('');
    html += `<h3 id="${anchor(f.path)}">${esc(f.path)}</h3>\n<pre>${body}</pre>\n`;
  }
}
html += '</body></html>\n';

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'SOURCE-CODE.md'), md);
await writeFile(join(OUT, 'SOURCE-CODE.html'), html);
const kb = async (n) => Math.round((await stat(join(OUT, n))).size / 1024);
console.log(`Wrote docs/SOURCE-CODE.md (${await kb('SOURCE-CODE.md')} KB) and docs/SOURCE-CODE.html (${await kb('SOURCE-CODE.html')} KB)`);
console.log(`${files.length} files, ${total} lines`);
