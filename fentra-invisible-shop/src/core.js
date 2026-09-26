// Core: maths, colour, the street camera and the outlined-illustration drawing helpers.
export const W = 1080, H = 1920;
export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const sstep = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
export const easeIO = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeO = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeI = (t) => Math.pow(clamp(t), 3);
export const sine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const quint = (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; };
export const win = (t, a, b, c, d) => sstep(a, b, t) * (1 - sstep(c, d, t));

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (i, s) => { const r = mulberry32((i * 374761393 + s * 668265263) | 0); return r(); };
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}

// ------------------------------------------------------------------ colour
export function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgb(c, a = 1) { return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(4)})`; }
export function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
export const col = (c, a = 1) => rgb(typeof c === 'string' ? hex(c) : c, a);
export const tint = (c, k) => { const v = typeof c === 'string' ? hex(c) : c; return k >= 0 ? mix(v, [255, 255, 255], k) : mix(v, [20, 22, 28], -k); };
export const tintS = (c, k, a = 1) => rgb(tint(c, k), a);

// Palette — warm off-white city, charcoal ink, one controlled accent (Fentra blue, sampled from the logo).
export const PAL = {
  paper: '#F4F0E8', ink: '#2B2C31', inkSoft: '#56585F',
  sky0: '#CFDDE6', sky1: '#E6ECEC', sky2: '#F5EFE4',
  sun: '#FFE9C4', warm: '#FFD99A', glassDay: '#B9C7CC',
  blue: '#1C73FD', blueSoft: '#7FB0FF', navy: '#1F2B44',
  asphalt: '#A7A39C', asphaltDark: '#98948D', paving: '#DDD6CA', curb: '#CFC7BA', shade: '#5A5E73',
};

// ------------------------------------------------------------------ camera
// Street space: X along the street (right), Y up, Z from the facade line toward the camera (metres).
// The camera looks straight at the facades (-Z); a vertical lens shift (hy) tilts without converging verticals.
export class Cam {
  constructor(o = {}) { Object.assign(this, { x: 0, y: 1.7, z: 14, f: 1000, hy: H * 0.55 }, o); }
  set(o) { Object.assign(this, o); return this; }
  d(Z) { return this.z - Z; }
  k(Z) { return this.f / (this.z - Z); } // px per metre on the plane at Z
  P(X, Y, Z) { const d = this.z - Z; return [W / 2 + this.f * (X - this.x) / d, this.hy - this.f * (Y - this.y) / d, d]; }
  // screen → world X on plane Z
  X(sx, Z) { return this.x + (sx - W / 2) * (this.z - Z) / this.f; }
  Y(sy, Z) { return this.y - (sy - this.hy) * (this.z - Z) / this.f; }
  plane(ctx, Z) { const k = this.k(Z); ctx.setTransform(k, 0, 0, -k, W / 2 - k * this.x, this.hy + k * this.y); return k; }
}

// ------------------------------------------------------------------ drawing
export function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
export function smooth(ctx, pts, closed = true) {
  const n = pts.length; ctx.beginPath();
  if (!closed) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } ctx.lineTo(pts[n - 1][0], pts[n - 1][1]); return; }
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2]; ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  ctx.closePath();
}
export function rrectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}
// fill + controlled ink outline (lw in current units)
export function ink(ctx, fill, lw, stroke = PAL.ink, a = 1) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore(); }
}
export function line(ctx, pts, lw, stroke = PAL.ink) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}
export function rect(ctx, x, y, w, h, fill, lw = 0, stroke) { ctx.beginPath(); ctx.rect(x, y, w, h); ink(ctx, fill, lw, stroke); }
export function ell(ctx, x, y, rx, ry, fill, lw = 0, stroke) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); ink(ctx, fill, lw, stroke); }

// Text on a street plane (the plane transform has Y flipped; flip back locally).
export function planeText(ctx, str, x, y, sizeM, font, fill, opts = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, -1);
  ctx.font = font.replace('{s}', '100px'); const s = sizeM / 100; ctx.scale(s, s);
  ctx.fillStyle = fill; ctx.textAlign = opts.align || 'center'; ctx.textBaseline = opts.base || 'middle';
  if (opts.spacing) ctx.letterSpacing = `${opts.spacing}px`;
  ctx.fillText(str, 0, 0); ctx.restore();
}

// scratch canvases (reused)
const pool = [];
export function scratch(i, w = W, h = H) {
  let c = pool[i];
  if (!c) { c = pool[i] = document.createElement('canvas'); c.width = w; c.height = h; c.g = c.getContext('2d'); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.globalAlpha = 1; c.g.globalCompositeOperation = 'source-over'; c.g.filter = 'none';
  c.g.clearRect(0, 0, w, h);
  return c;
}

// seeded texture tile (paper grain / stucco)
export function grainTile(size = 512, seed = 3, amp = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const img = g.createImageData(size, size); const r = mulberry32(seed);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (r() - 0.5) * 90 * amp + (r() - 0.5) * 40 * amp;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // soft fibres
  g.globalAlpha = 0.05 * amp;
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size, a = r() * TAU, l = 6 + r() * 24;
    g.strokeStyle = r() < 0.5 ? '#000' : '#fff'; g.lineWidth = 0.6 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}
