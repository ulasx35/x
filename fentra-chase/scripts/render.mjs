// Renders the film frame-by-frame in headless Chromium (parallel pages) and pipes frames into ffmpeg.
//   node scripts/render.mjs                         → output/_video.mp4 + output/cues.json
//   node scripts/render.mjs --stills 2,5.5,9        → output/stills/t_2.00.png ...
//   node scripts/render.mjs --sheet                 → output/stills/sheet.png (character model sheet)
//   node scripts/render.mjs --range 30,40           → output/_range.mp4 (preview a section)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'output');
const args = process.argv.slice(2);
const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const FPS = 24;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/src/index.html`;

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb', '--disable-lcd-text'] });
async function openPage(query = '') {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exit(1); });
  await page.goto(base + query);
  await page.waitForFunction(() => window.filmReady === true, null, { timeout: 180000 });
  return page;
}
const shot = async (page, t) => {
  await page.evaluate((tt) => window.renderAt(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
};
const ffmpeg = () => execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
if (args.includes('--sheet')) {
  const page = await openPage('?sheet=1');
  fs.writeFileSync(path.join(OUT, 'stills', 'sheet.png'), await shot(page, Number(arg('--sheet') ?? 0) || 0));
  console.log('sheet written');
} else if (arg('--stills')) {
  const page = await openPage();
  for (const s of arg('--stills').split(',').map(Number)) {
    const t0 = Date.now();
    fs.writeFileSync(path.join(OUT, 'stills', `t_${s.toFixed(2)}.png`), await shot(page, s));
    console.log(`still ${s}s (${Date.now() - t0} ms)`);
  }
} else {
  const probe = await openPage();
  const duration = await probe.evaluate(() => window.FILM.duration);
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(await probe.evaluate(() => window.FILM.cues()), null, 1));
  await probe.close();
  const range = arg('--range') ? arg('--range').split(',').map(Number) : [0, duration];
  const f0 = Math.round(range[0] * FPS), f1 = Math.round(range[1] * FPS);
  const outFile = path.join(OUT, arg('--range') ? '_range.mp4' : '_video.mp4');
  const ff = spawn(ffmpeg(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const workers = Math.max(1, Math.min(Number(arg('--workers')) || os.cpus().length, 4));
  const pages = await Promise.all(Array.from({ length: workers }, () => openPage()));
  const done = new Map(); let next = f0; let cursor = f0;
  const start = Date.now();
  const flush = async () => {
    while (done.has(cursor)) {
      const buf = done.get(cursor); done.delete(cursor);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((cursor - f0) % 48 === 0) console.log(`frame ${cursor - f0}/${f1 - f0}  ${((Date.now() - start) / 1000).toFixed(0)}s`);
      cursor++;
    }
  };
  await Promise.all(pages.map(async (page) => {
    while (next < f1) {
      const i = next++;
      done.set(i, await shot(page, i / FPS));
      while (done.size > workers * 6 && !done.has(cursor)) await new Promise((r) => setTimeout(r, 5));
      await flush();
    }
  }));
  await flush();
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`video frames done: ${outFile}  (${duration.toFixed(2)}s film)`);
}
await browser.close();
server.close();
