// Minimal 2.5D engine: a real perspective camera for environments (drawn as flat,
// graphic-novel planes in Canvas2D) + helpers for light, fog and figure compositing.
export const W = 1080, H = 1920;

// ------------------------------------------------------------------ math
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const sstep = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
export const easeIO = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const sine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
export const win = (t, a, b, c, d) => sstep(a, b, t) * (1 - sstep(c, d, t));
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const TAU = Math.PI * 2;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// smooth 1D value noise
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// ------------------------------------------------------------------ colour
export function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgb(c, a = 1) { return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
export function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
export function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

// ------------------------------------------------------------------ camera
export class Cam {
  constructor(pos = [0, 1.6, 0], target = [0, 1.6, -1], vfov = 50, roll = 0) {
    this.set(pos, target, vfov, roll);
  }
  set(pos, target, vfov = this.vfov, roll = 0) {
    this.pos = pos; this.vfov = vfov; this.roll = roll;
    const dx = target[0] - pos[0], dy = target[1] - pos[1], dz = target[2] - pos[2];
    this.yaw = Math.atan2(dx, -dz);
    this.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    this.f = (H / 2) / Math.tan((vfov * Math.PI / 180) / 2);
    this.cy = Math.cos(this.yaw); this.sy = Math.sin(this.yaw);
    this.cp = Math.cos(this.pitch); this.sp = Math.sin(this.pitch);
    this.cr = Math.cos(roll); this.sr = Math.sin(roll);
    return this;
  }
  toCam(p) {
    const x = p[0] - this.pos[0], y = p[1] - this.pos[1], z = p[2] - this.pos[2];
    // yaw about y (0 = looking -z)
    const x1 = x * this.cy + z * this.sy;
    const z1 = -x * this.sy + z * this.cy;
    // pitch about x
    const y2 = y * this.cp + z1 * this.sp;
    const z2 = -y * this.sp + z1 * this.cp;
    return [x1, y2, z2]; // looking toward -z2
  }
  screen(c) {
    const d = -c[2];
    let x = this.f * c[0] / d, y = -this.f * c[1] / d;
    if (this.roll) { const xr = x * this.cr - y * this.sr; y = x * this.sr + y * this.cr; x = xr; }
    return [W / 2 + x, H / 2 + y, d];
  }
  project(p) { return this.screen(this.toCam(p)); }
  // pixels per metre at a world point
  scaleAt(p) { return this.f / Math.max(0.05, -this.toCam(p)[2]); }
  depth(p) { return -this.toCam(p)[2]; }
}

const NEAR = 0.08;
// Clip a camera-space polygon against the near plane, then project.
export function projectPoly(cam, pts) {
  const c = pts.map((p) => cam.toCam(p));
  const out = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length];
    const da = -a[2] - NEAR, db = -b[2] - NEAR;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
    }
  }
  return out.map((p) => cam.screen(p));
}
export function pathPoly(ctx, sp) {
  ctx.beginPath();
  sp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}
export function fillPoly(ctx, cam, pts, fill) {
  const sp = projectPoly(cam, pts);
  if (sp.length < 3) return null;
  pathPoly(ctx, sp);
  ctx.fillStyle = fill; ctx.fill();
  return sp;
}
export function line3(ctx, cam, a, b, stroke, width = 1) {
  let ca = cam.toCam(a), cb = cam.toCam(b);
  const da = -ca[2] - NEAR, db = -cb[2] - NEAR;
  if (da < 0 && db < 0) return;
  if (da < 0) ca = lerp3(ca, cb, da / (da - db));
  else if (db < 0) cb = lerp3(ca, cb, da / (da - db));
  const pa = cam.screen(ca), pb = cam.screen(cb);
  ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]);
  ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
}

// Fog: exponential mix toward the night haze colour.
export const FOG = hex('#1b2230');
export function fogged(c, d, density = 0.045, fog = FOG) { return mix(c, fog, 1 - Math.exp(-d * density)); }

// ------------------------------------------------------------------ light
export function glow(ctx, x, y, r, c, a = 1, op = 'lighter') {
  if (r <= 0.5 || a <= 0.001) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(c, a)); g.addColorStop(0.25, rgb(c, a * 0.45)); g.addColorStop(1, rgb(c, 0));
  ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
export function softDisc(ctx, x, y, rx, ry, c, a = 1, op = 'lighter', inner = 0) {
  if (rx < 0.5 || ry < 0.5 || a <= 0.001) return;
  ctx.save(); ctx.globalCompositeOperation = op;
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * inner, 0, 0, rx);
  g.addColorStop(0, rgb(c, a)); g.addColorStop(1, rgb(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
// Volumetric beam (a cone seen through haze) from p0 (source, radius r0) to p1 (radius r1), screen space.
export function beam(ctx, p0, p1, r0, r1, c, a = 0.3, op = 'lighter') {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);
  if (L < 1 || a <= 0.001) return;
  const nx = -dy / L, ny = dx / L;
  ctx.save(); ctx.globalCompositeOperation = op;
  const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  g.addColorStop(0, rgb(c, a)); g.addColorStop(0.55, rgb(c, a * 0.35)); g.addColorStop(1, rgb(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(p0[0] + nx * r0, p0[1] + ny * r0);
  ctx.lineTo(p1[0] + nx * r1, p1[1] + ny * r1);
  ctx.lineTo(p1[0] - nx * r1, p1[1] - ny * r1);
  ctx.lineTo(p0[0] - nx * r0, p0[1] - ny * r0);
  ctx.closePath(); ctx.filter = `blur(${Math.max(2, r0 * 0.6).toFixed(1)}px)`; ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ offscreen figure compositing
const pool = [];
export function scratch(i, w = W, h = H) {
  if (!pool[i]) { const c = document.createElement('canvas'); c.width = w; c.height = h; pool[i] = c; }
  const c = pool[i];
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none';
  g.clearRect(0, 0, w, h);
  return [c, g];
}

// Draw a figure through a lighting pass.
//  draw(g)          — draws the figure in screen space onto g
//  opts.rims        — [{dir:[x,y] toward light, color, a, w}]  edge light
//  opts.shade       — {from:[x,y], to:[x,y], a}  ambient falloff (darkening gradient)
//  opts.spots       — [{x,y,r,color,a}] light pools on the figure (flashlights, lamps)
//  opts.dark        — 0..1 silhouette crush (noir backlight)
export function figure(ctx, draw, opts = {}) {
  const [fc, fg] = scratch(0);
  draw(fg);
  const [sc, sg] = scratch(1);
  sg.drawImage(fc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#fff'; sg.fillRect(0, 0, W, H); // silhouette
  fg.globalCompositeOperation = 'source-atop';
  if (opts.dark) { fg.fillStyle = rgb(opts.darkColor || [8, 10, 14], opts.dark); fg.fillRect(0, 0, W, H); }
  if (opts.shade) {
    const s = opts.shade, gr = fg.createLinearGradient(s.from[0], s.from[1], s.to[0], s.to[1]);
    gr.addColorStop(0, 'rgba(6,8,12,0)'); gr.addColorStop(1, `rgba(6,8,12,${s.a})`);
    fg.fillStyle = gr; fg.fillRect(0, 0, W, H);
  }
  if (opts.spots) for (const s of opts.spots) {
    fg.globalCompositeOperation = 'source-atop';
    const gr = fg.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    gr.addColorStop(0, rgb(s.color, s.a)); gr.addColorStop(1, rgb(s.color, 0));
    fg.fillStyle = gr; fg.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  if (opts.rims) for (const r of opts.rims) {
    const [rc, rg] = scratch(2);
    rg.drawImage(sc, 0, 0);
    rg.globalCompositeOperation = 'destination-out';
    rg.drawImage(sc, -r.dir[0] * r.w, -r.dir[1] * r.w);
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = rgb(r.color, r.a); rg.fillRect(0, 0, W, H);
    fg.globalCompositeOperation = 'source-atop';
    fg.filter = `blur(${Math.max(0.6, r.w * 0.35).toFixed(1)}px)`;
    fg.drawImage(rc, 0, 0); fg.filter = 'none';
  }
  fg.globalCompositeOperation = 'source-over';
  if (opts.before) opts.before(sc);
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.blur) ctx.filter = `blur(${opts.blur}px)`;
  ctx.drawImage(fc, 0, 0);
  ctx.restore();
  return sc; // silhouette (reusable for shadows until next figure call)
}

// Cast a silhouette as a shadow with an affine transform (a,b,c,d,e,f like setTransform).
export function castShadow(ctx, silhouette, m, a = 0.6, blur = 6, color = '#05070a') {
  const [tc, tg] = scratch(3);
  tg.drawImage(silhouette, 0, 0);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = color; tg.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = a; ctx.filter = `blur(${blur}px)`;
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.drawImage(tc, 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------ 2D shape helpers
export function capsule(g, a, b, ra, rb, fill) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L, ny = dx / L, ang = Math.atan2(dy, dx);
  g.beginPath();
  g.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  g.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  g.arc(b[0], b[1], rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  g.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  g.arc(a[0], a[1], ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  g.closePath(); g.fillStyle = fill; g.fill();
}
export function poly2(g, pts, fill) {
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  g.fillStyle = fill; g.fill();
}
// Smooth closed shape through points (Catmull-Rom → Bézier).
export function smoothShape(g, pts, fill, closed = true) {
  const n = pts.length;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const q0 = closed || i > 0 ? p0 : p1, q3 = closed || i + 2 < n ? p3 : p2;
    g.bezierCurveTo(p1[0] + (p2[0] - q0[0]) / 6, p1[1] + (p2[1] - q0[1]) / 6, p2[0] - (q3[0] - p1[0]) / 6, p2[1] - (q3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
// 2-bone IK in 2D: returns middle joint for root a, end b, lengths l1 l2, bend direction sign.
export function ik(a, b, l1, l2, bend = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 1e-4;
  let bx = b[0], by = b[1];
  if (d > maxd) { bx = a[0] + dx / d * maxd; by = a[1] + dy / d * maxd; d = maxd; }
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const base = Math.atan2(by - a[1], bx - a[0]);
  const ang = base + bend * Math.acos(cosA);
  return { mid: [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1], end: [bx, by] };
}
// Access a scratch canvas without clearing it.
export function peek(i) { return pool[i]; }
