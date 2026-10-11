// Renders the episode frame by frame in headless Chromium and pipes the frames into ffmpeg.
//   node scripts/render.mjs                         → output/_video.mp4 (all frames, no audio)
//   node scripts/render.mjs --workers 2             → split across parallel browsers, then joined
//   node scripts/render.mjs --stills 2,5.5,9        → output/stills/t_2.00.png ...
//   node scripts/render.mjs --from 10 --to 20 --fps 10 --out _clip.mp4   (quick motion preview)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const EP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');          // this episode's folder (bolum-NN/)
const ROOT = path.resolve(EP, '..');                                                   // served: node_modules + assets
const OUT = path.join(EP, 'output');
const cues = JSON.parse(fs.readFileSync(path.join(OUT, 'cues.json'), 'utf8'));
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const FPS = Number(arg('--fps', 30));
const FROM = Number(arg('--from', 0)), TO = Number(arg('--to', cues.duration));
const WORKERS = Number(arg('--workers', 1));
const OUTFILE = path.join(OUT, arg('--out', '_video.mp4'));
const stillsArg = arg('--stills', null);
const FF = execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${path.basename(EP)}/src/index.html${process.env.Q || ''}`;

async function openPage() {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exit(1); });
  await page.goto(url);
  await page.waitForFunction(() => window.filmReady === true, null, { timeout: 180000 });
  const frameAt = async (t) => {
    await page.evaluate((tt) => window.renderAt(tt), t);
    return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  };
  return { browser, frameAt };
}

async function renderRange(i0, i1, file, tag) {
  const { browser, frameAt } = await openPage();
  const ff = spawn(FF, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', file], { stdio: ['pipe', 'ignore', 'inherit'] });
  const start = Date.now();
  for (let i = i0; i < i1; i++) {
    const buf = await frameAt(FROM + i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((i - i0) % 30 === 0) console.log(`${tag} frame ${i - i0}/${i1 - i0}  ${((Date.now() - start) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
}

if (stillsArg) {
  const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const { browser, frameAt } = await openPage();
  for (const s of stillsArg.split(',').map(Number)) {
    const t0 = Date.now();
    fs.writeFileSync(path.join(dir, `t_${s.toFixed(2)}.png`), await frameAt(s));
    console.log(`still ${s}s  (${Date.now() - t0} ms)`);
  }
  await browser.close();
} else if (args.includes('--chunked')) {
  // resumable: fixed chunks rendered to output/_chunks/, skipped when already there; stops starting new
  // chunks when the time budget would be exceeded, and joins them once all are done
  const C = Number(arg('--chunk', 100)), BUDGET = Number(arg('--budget', 1560)) * 1000;
  const total = Math.round((TO - FROM) * FPS), nChunks = Math.ceil(total / C);
  const dir = path.join(OUT, '_chunks'); fs.mkdirSync(dir, { recursive: true });
  const name = (k) => path.join(dir, `c_${String(k).padStart(4, '0')}.mp4`);
  const todo = [...Array(nChunks).keys()].filter((k) => !fs.existsSync(name(k)));
  const t0 = Date.now(), times = []; let next = 0;
  await Promise.all([...Array(WORKERS)].map(async (_, w) => {
    while (next < todo.length) {
      const avg = times.length ? times.reduce((a, b) => a + b) / times.length : 600000;
      if (Date.now() - t0 + avg > BUDGET) break;
      const k = todo[next++], s0 = Date.now(), tmp = name(k).replace('.mp4', '.tmp.mp4');
      await renderRange(k * C, Math.min(total, (k + 1) * C), tmp, `w${w} c${k}`);
      fs.renameSync(tmp, name(k)); times.push(Date.now() - s0);
    }
  }));
  const done = [...Array(nChunks).keys()].filter((k) => fs.existsSync(name(k)));
  console.log(`chunks done ${done.length}/${nChunks}`);
  if (done.length === nChunks) {
    const list = path.join(dir, 'list.txt');
    fs.writeFileSync(list, done.map((k) => `file '${name(k)}'`).join('\n'));
    execFileSync(FF, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUTFILE], { stdio: 'inherit' });
    console.log('video frames done:', OUTFILE);
  }
} else {
  const total = Math.round((TO - FROM) * FPS);
  if (WORKERS <= 1) await renderRange(0, total, OUTFILE, 'w0');
  else {
    const per = Math.ceil(total / WORKERS), parts = [];
    await Promise.all([...Array(WORKERS)].map((_, w) => {
      const f = OUTFILE.replace(/\.mp4$/, `.part${w}.mp4`); parts.push(f);
      return renderRange(w * per, Math.min(total, (w + 1) * per), f, `w${w}`);
    }));
    const list = OUTFILE.replace(/\.mp4$/, '.txt');
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
    execFileSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUTFILE], { stdio: 'inherit' });
    parts.forEach((p) => fs.unlinkSync(p)); fs.unlinkSync(list);
  }
  console.log('video frames done:', OUTFILE);
}
server.close();
