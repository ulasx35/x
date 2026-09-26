// The street: one coherent block of buildings, shops, pavement and road, drawn as a clean line illustration.
// Street space (metres): X along the street, Y up, Z from the facade line toward the camera.
import { W, H, TAU, clamp, lerp, inv, sstep, easeO, easeIO, mulberry32, noise1, hex, rgb, mix, col, tint, tintS, PAL, poly, smooth, rrectPath, ink, line, rect, ell, planeText, scratch, grainTile } from './core.js';

export const GH = 4.3, FH = 3.3;            // ground-floor and upper-floor heights
export const CURB = 3.8, ROAD1 = 11.0;      // far kerb line, near kerb line
const SERIF = '500 {s} "Fraunces"', SANS = '600 {s} "Manrope"', SERIF_I = 'italic 400 {s} "Instrument Serif"';

// px line weights for a plane at scale k (px per metre)
export const LW = (k, m = 1) => clamp(k * 0.017, 0.9, 3.1) * m;

let STUCCO = null;
const stuccoPattern = (ctx) => {
  if (!STUCCO) STUCCO = grainTile(256, 11, 1.0);
  const p = ctx.createPattern(STUCCO, 'repeat'); p.setTransform(new DOMMatrix().scale(0.012)); return p;
};

// ------------------------------------------------------------------ the block
// windows: per building, number of bays; style: 'shutter' | 'balcony' | 'modern' | 'classic'
export const BUILDINGS = [
  { x0: -30, x1: -23, floors: 3, wall: '#E4DCCD', trim: '#F2ECE1', style: 'classic', bays: 3, shutter: '#8E9C94', shop: { kind: 'plain', frame: '#5E6660' } },
  { x0: -23, x1: -16.5, floors: 4, wall: '#E9E1D2', trim: '#F5EFE4', style: 'shutter', bays: 3, shutter: '#9AA7A0', roof: 'cornice', shop: { kind: 'grocer', name: 'MANAV', frame: '#4F5F52', awning: '#7F9580', stripe: '#EDE8DC', door: 'right' } },
  { x0: -16.5, x1: -10, floors: 4, wall: '#E2D3BE', trim: '#F1E7D8', style: 'balcony', bays: 3, shutter: '#B59C86', roof: 'cornice', shop: { kind: 'florist', name: 'ÇİÇEK', frame: '#6D7663', awning: '#C39A86', door: 'left' } },
  { x0: -10, x1: -3.25, floors: 5, wall: '#DAD8D2', trim: '#EEEDE8', style: 'classic', bays: 3, shutter: '#8C979C', roof: 'mansard', shop: { kind: 'cafe', name: 'KAHVE', frame: '#3F5347', awning: '#93A694', stripe: '#EAE6DA', door: 'right' } },
  { x0: -3.25, x1: 3.25, floors: 4, wall: '#EEE6D8', trim: '#F8F3EA', style: 'hero', bays: 3, shutter: '#A5AFB6', roof: 'balustrade', shop: { kind: 'hero' } },
  { x0: 3.25, x1: 10, floors: 4, wall: '#D8CFC2', trim: '#EAE3D8', style: 'shutter', bays: 3, shutter: '#6F7B82', roof: 'mansard2', shop: { kind: 'books', name: 'KİTAP', frame: '#34363C', door: 'right' } },
  { x0: 10, x1: 16.5, floors: 3, wall: '#E7E5E0', trim: '#F4F3F0', style: 'modern', bays: 3, shutter: '#999', roof: 'flat', shop: { kind: 'optic', name: 'OPTİK', frame: '#C9C6BF', door: 'left' } },
  { x0: 16.5, x1: 23, floors: 4, wall: '#DED2C0', trim: '#EEE6D9', style: 'balcony', bays: 3, shutter: '#A89A88', roof: 'cornice', shop: { kind: 'gallery', name: 'GALERİ', frame: '#2F3136', door: 'right' } },
  { x0: 23, x1: 30, floors: 5, wall: '#E3E0D8', trim: '#F1EFEA', style: 'shutter', bays: 3, shutter: '#8C9A92', roof: 'cornice', shop: { kind: 'plain', frame: '#6A6A66' } },
];
export const heightOf = (b) => GH + b.floors * FH + (b.roof === 'mansard' || b.roof === 'mansard2' ? 2.4 : 0.9);
export const HERO = BUILDINGS[4];
export const HERO_DOOR_X = 0; // centre of the hero shop's recessed door
let DOOR_OPEN = () => 0;
export function setDoorOpen(f) { DOOR_OPEN = f; }

// ------------------------------------------------------------------ sky & distance
export function drawSky(ctx, cam, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // sky gradient pinned to the horizon so a crane-up reveals more of the upper sky
  const hz = cam.hy, top = cam.hy - cam.f * 0.9;
  const g = ctx.createLinearGradient(0, top, 0, hz);
  g.addColorStop(0, '#C3D4E0'); g.addColorStop(0.45, '#D9E3E8'); g.addColorStop(0.8, '#EEEDE6'); g.addColorStop(1, '#F6EEE2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft clouds on a far plane (slow drift + parallax)
  const clouds = [[-40, 70, 0.9], [15, 88, 1.25], [55, 62, 0.8], [-8, 120, 1.5], [36, 140, 1.1], [-60, 105, 1.2], [90, 96, 1.0]];
  const Z = -260;
  for (const [cx, cy, s] of clouds) {
    const X = cx + t * 0.35, p = cam.P(X, cy, Z), k = cam.k(Z) * s;
    if (p[0] < -600 || p[0] > W + 600 || p[1] < -400 || p[1] > H + 200) continue;
    ctx.save(); ctx.translate(p[0], p[1]);
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = 'rgba(255,252,246,0.78)';
    ctx.beginPath();
    for (const [dx, dy, r] of [[-9, 0, 5], [-3, -3, 7], [4, -2, 6], [10, 0, 4.5], [0, 1.5, 6.5], [-14, 1.5, 3.5], [15, 1.8, 3]]) ctx.ellipse(dx * k, dy * k, r * k * 1.25, r * k * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(214,222,232,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 3 * k, 17 * k, 2.4 * k, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// distant rooftops beyond the block, softened by haze
export function drawFar(ctx, cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const layers = [[-70, '#CBD4D8', 0.75, 7], [-38, '#BFC9CD', 0.9, 13]];
  for (const [Z, c, a, seed] of layers) {
    const r = mulberry32(seed);
    ctx.beginPath(); let X = cam.X(-80, Z) - 10; const Xend = cam.X(W + 80, Z) + 10;
    const base = cam.P(0, 0, Z)[1];
    X = Math.floor(X / 5) * 5;
    ctx.moveTo(cam.P(X, 0, Z)[0], base);
    // deterministic by X so the silhouette is stable under camera motion
    for (let x = X; x < Xend; x += 5) {
      const rr = mulberry32(((x + 1000) * 7919 + seed) | 0); const h = 19 + rr() * 10 + (Z < -50 ? 6 : 0);
      const p0 = cam.P(x, h, Z), p1 = cam.P(x + 5, h, Z);
      ctx.lineTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
      if (rr() < 0.25) { const c0 = cam.P(x + 1.6, h, Z), c1 = cam.P(x + 1.6, h + 1.8, Z), c2 = cam.P(x + 2.3, h + 1.8, Z), c3 = cam.P(x + 2.3, h, Z); ctx.lineTo(c3[0], c3[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c0[0], c0[1]); ctx.lineTo(p1[0], p1[1]); }
    }
    ctx.lineTo(cam.P(Xend, 0, Z)[0], base); ctx.closePath();
    ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ facades
function windowBay(ctx, k, x, y, w, h, b, opts = {}) {
  const lw = LW(k), u = 1 / k;
  // reveal (recess) with sun-side shadow
  rect(ctx, x - 0.06, y - 0.06, w + 0.12, h + 0.12, b.trim, lw * 0.8 * u);
  rect(ctx, x, y, w, h, '#8E9AA0', 0);
  // glass: sky reflection + curtain hint
  const g = ctx.createLinearGradient(0, y + h, 0, y);
  g.addColorStop(0, '#7F8C94'); g.addColorStop(0.55, '#A9B6BC'); g.addColorStop(1, '#C9D3D6');
  ctx.fillStyle = g; ctx.fillRect(x + 0.05, y + 0.05, w - 0.1, h - 0.1);
  if (opts.curtain) { ctx.fillStyle = 'rgba(244,238,226,0.55)'; ctx.fillRect(x + 0.05, y + h * 0.25, w * 0.28, h * 0.7); ctx.fillRect(x + w - 0.05 - w * 0.22, y + h * 0.25, w * 0.22, h * 0.7); }
  // diagonal reflection
  ctx.save(); ctx.beginPath(); ctx.rect(x + 0.05, y + 0.05, w - 0.1, h - 0.1); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(x + w * 0.1, y + h); ctx.lineTo(x + w * 0.45, y + h); ctx.lineTo(x + w * 0.05, y + h * 0.35); ctx.lineTo(x - w * 0.3, y + h * 0.35); ctx.fill();
  ctx.restore();
  // shadow of the reveal (sun from upper left → top and left inner edges)
  ctx.fillStyle = 'rgba(60,60,80,0.16)'; ctx.fillRect(x + 0.05, y + h - 0.2, w - 0.1, 0.15); ctx.fillRect(x + 0.05, y + 0.05, 0.1, h - 0.1);
  // frame + mullions
  ctx.beginPath(); ctx.rect(x + 0.05, y + 0.05, w - 0.1, h - 0.1); ink(ctx, null, lw * 0.75 * u);
  line(ctx, [[x + w / 2, y + 0.05], [x + w / 2, y + h - 0.05]], lw * 0.6 * u);
  line(ctx, [[x + 0.05, y + h * 0.72], [x + w - 0.05, y + h * 0.72]], lw * 0.5 * u);
  // sill
  rect(ctx, x - 0.14, y - 0.14, w + 0.28, 0.1, b.trim, lw * 0.8 * u);
  ctx.fillStyle = 'rgba(60,60,80,0.18)'; ctx.fillRect(x - 0.1, y - 0.22, w + 0.2, 0.08);
  // lintel / pediment for classic
  if (opts.lintel) {
    rect(ctx, x - 0.12, y + h + 0.06, w + 0.24, 0.16, b.trim, lw * 0.8 * u);
    ctx.fillStyle = 'rgba(60,60,80,0.14)'; ctx.fillRect(x - 0.1, y + h - 0.02, w + 0.2, 0.08);
  }
  if (opts.shutters) {
    for (const s of [-1, 1]) {
      const sx = s < 0 ? x - 0.06 - w * 0.5 : x + w + 0.06;
      rect(ctx, sx, y - 0.02, w * 0.5, h + 0.04, opts.shutters, lw * 0.75 * u);
      ctx.strokeStyle = 'rgba(30,32,40,0.28)'; ctx.lineWidth = lw * 0.45 * u; ctx.beginPath();
      for (let yy = y + 0.12; yy < y + h - 0.05; yy += 0.13) { ctx.moveTo(sx + 0.06, yy); ctx.lineTo(sx + w * 0.5 - 0.06, yy); }
      ctx.stroke();
    }
  }
  if (opts.box) {
    // flower box with greenery
    const by = y - 0.1;
    const r = mulberry32((x * 100 + y * 10) | 0);
    ctx.fillStyle = '#6F8A6C';
    for (let i = 0; i < 9; i++) { const px = x + 0.05 + r() * (w - 0.1); ctx.beginPath(); ctx.ellipse(px, by + 0.3 + r() * 0.15, 0.16 + r() * 0.08, 0.13 + r() * 0.06, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = opts.flower || '#D9A7A0';
    for (let i = 0; i < 7; i++) { const px = x + 0.1 + r() * (w - 0.2); ctx.beginPath(); ctx.arc(px, by + 0.36 + r() * 0.16, 0.045, 0, TAU); ctx.fill(); }
    rect(ctx, x - 0.02, by - 0.02, w + 0.04, 0.26, '#8C7A68', lw * 0.8 * u);
  }
}

function balcony(ctx, cam, x, y, w) {
  // slab in perspective + railing on the front plane Z = 0.7
  const Zf = 0.7, Z0 = 0;
  const a = cam.P(x, y, Z0), b = cam.P(x + w, y, Z0), c = cam.P(x + w, y, Zf), d = cam.P(x, y, Zf);
  const a2 = cam.P(x, y - 0.16, Zf), b2 = cam.P(x + w, y - 0.16, Zf);
  const kf = cam.k(Zf), lw = LW(kf);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // top (visible when camera above) or underside (below)
  poly(ctx, [a, b, c, d]); ink(ctx, cam.y > y ? '#E9E3D8' : '#BDB7AE', lw * 0.8);
  poly(ctx, [d, c, b2, a2]); ink(ctx, '#D8D1C4', lw * 0.8);
  // railing on the front plane
  cam.plane(ctx, Zf); const u = 1 / kf;
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 0.9 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + 1.0); ctx.lineTo(x + w, y + 1.0); ctx.stroke();
  ctx.lineWidth = lw * 0.55 * u; ctx.beginPath();
  for (let xx = x + 0.1; xx < x + w - 0.05; xx += 0.12) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + 1.0); }
  ctx.moveTo(x, y + 0.12); ctx.lineTo(x + w, y + 0.12); ctx.stroke();
  // a few scroll accents
  ctx.lineWidth = lw * 0.5 * u;
  for (let xx = x + 0.4; xx < x + w - 0.2; xx += 0.6) { ctx.beginPath(); ctx.arc(xx, y + 0.8, 0.08, 0, TAU); ctx.stroke(); }
  // plants
  const r = mulberry32((x * 31) | 0);
  if (r() < 0.8) {
    const px = x + 0.25 + r() * (w - 0.5);
    ctx.fillStyle = '#6E896B';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(px + (r() - 0.5) * 0.4, y + 0.55 + r() * 0.5, 0.15, 0.2, 0, 0, TAU); ctx.fill(); }
    rect(ctx, px - 0.14, y + 0.14, 0.28, 0.3, '#B58A6D', lw * 0.7 * u);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function roofline(ctx, cam, b, k) {
  const u = 1 / k, lw = LW(k), top = GH + b.floors * FH;
  const x0 = b.x0, x1 = b.x1;
  // cornice
  rect(ctx, x0, top, x1 - x0, 0.25, b.trim, lw * 0.9 * u);
  rect(ctx, x0 - 0.12, top + 0.25, x1 - x0 + 0.24, 0.3, b.trim, lw * 0.9 * u);
  ctx.fillStyle = 'rgba(60,60,80,0.2)'; ctx.fillRect(x0, top - 0.14, x1 - x0, 0.14);
  // dentils
  ctx.fillStyle = 'rgba(60,60,80,0.18)';
  for (let x = x0 + 0.12; x < x1 - 0.1; x += 0.28) ctx.fillRect(x, top + 0.04, 0.12, 0.13);
  if (b.roof === 'mansard' || b.roof === 'mansard2') {
    const y0 = top + 0.55, h = 2.1;
    ctx.beginPath(); ctx.moveTo(x0 + 0.05, y0); ctx.lineTo(x1 - 0.05, y0); ctx.lineTo(x1 - 0.5, y0 + h); ctx.lineTo(x0 + 0.5, y0 + h); ctx.closePath();
    ink(ctx, b.roof === 'mansard' ? '#6F747C' : '#7A6F68', lw * u);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = lw * 0.5 * u; ctx.beginPath();
    for (let y = y0 + 0.3; y < y0 + h; y += 0.3) { ctx.moveTo(x0 + 0.1 + (y - y0) * 0.2, y); ctx.lineTo(x1 - 0.1 - (y - y0) * 0.2, y); } ctx.stroke();
    const n = b.bays, bw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + bw * (i + 0.5);
      ctx.beginPath(); ctx.moveTo(cx - 0.55, y0); ctx.lineTo(cx - 0.55, y0 + 1.5); ctx.lineTo(cx, y0 + 1.95); ctx.lineTo(cx + 0.55, y0 + 1.5); ctx.lineTo(cx + 0.55, y0); ctx.closePath();
      ink(ctx, b.trim, lw * 0.9 * u);
      rect(ctx, cx - 0.35, y0 + 0.2, 0.7, 1.15, '#9FAEB5', lw * 0.7 * u);
      line(ctx, [[cx, y0 + 0.2], [cx, y0 + 1.35]], lw * 0.5 * u);
    }
    // chimney
    rect(ctx, x1 - 1.6, y0 + h - 0.05, 0.6, 1.1, b.wall, lw * u);
    rect(ctx, x1 - 1.7, y0 + h + 1.0, 0.8, 0.18, b.trim, lw * 0.8 * u);
  } else if (b.roof === 'balustrade') {
    const y0 = top + 0.55;
    rect(ctx, x0 - 0.05, y0 + 0.75, x1 - x0 + 0.1, 0.16, b.trim, lw * 0.9 * u);
    rect(ctx, x0 - 0.05, y0, x1 - x0 + 0.1, 0.12, b.trim, lw * 0.8 * u);
    for (let x = x0 + 0.25; x < x1 - 0.15; x += 0.34) {
      ctx.beginPath(); ctx.moveTo(x - 0.07, y0 + 0.12); ctx.quadraticCurveTo(x - 0.16, y0 + 0.4, x - 0.05, y0 + 0.62); ctx.lineTo(x - 0.07, y0 + 0.75);
      ctx.lineTo(x + 0.07, y0 + 0.75); ctx.lineTo(x + 0.05, y0 + 0.62); ctx.quadraticCurveTo(x + 0.16, y0 + 0.4, x + 0.07, y0 + 0.12); ctx.closePath();
      ink(ctx, b.trim, lw * 0.55 * u);
    }
    // roof garden behind
    ctx.fillStyle = '#7C9479';
    for (const [dx, r] of [[1.2, 0.5], [1.8, 0.38], [4.9, 0.55], [5.4, 0.4]]) { ctx.beginPath(); ctx.ellipse(x0 + dx, y0 + 0.95 + r * 0.6, r, r * 0.9, 0, 0, TAU); ctx.fill(); }
    rect(ctx, x0 + 2.6, y0 + 0.9, 0.55, 1.2, b.wall, lw * u);
    rect(ctx, x0 + 2.5, y0 + 2.05, 0.75, 0.16, b.trim, lw * 0.8 * u);
  } else if (b.roof === 'cornice') {
    rect(ctx, x0 + 0.1, top + 0.55, x1 - x0 - 0.2, 0.35, b.trim, lw * 0.8 * u);
    rect(ctx, x0 + 0.9, top + 0.9, 0.55, 0.9, b.wall, lw * u);
  } else if (b.roof === 'flat') {
    rect(ctx, x0, top + 0.55, x1 - x0, 0.3, '#D7D4CD', lw * 0.8 * u);
  }
}

// exposed side walls where a taller building rises above its neighbour
function sideWalls(ctx, cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < BUILDINGS.length - 1; i++) {
    const a = BUILDINGS[i], b = BUILDINGS[i + 1];
    const ha = GH + a.floors * FH + 0.55, hb = GH + b.floors * FH + 0.55;
    if (Math.abs(ha - hb) < 0.1) continue;
    const tall = ha > hb ? a : b, x = a.x1, lo = Math.min(ha, hb), hi = Math.max(ha, hb);
    const facesRight = tall === a; // a's right wall faces +X: visible if cam.x > x
    if (facesRight ? cam.x < x : cam.x > x) continue;
    const p0 = cam.P(x, lo, 0), p1 = cam.P(x, hi, 0), p2 = cam.P(x, hi, -9), p3 = cam.P(x, lo, -9);
    poly(ctx, [p0, p1, p2, p3]); ink(ctx, tintS(tall.wall, -0.1), LW(cam.k(0)) * 0.9);
  }
}

// roof tops seen from above (only when the camera is higher than the roof)
function roofTops(ctx, cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const b of BUILDINGS) {
    const h = GH + b.floors * FH + 0.55;
    if (cam.y <= h + 0.2 || b.roof === 'mansard' || b.roof === 'mansard2') continue;
    const p = [cam.P(b.x0, h, 0), cam.P(b.x1, h, 0), cam.P(b.x1, h, -11), cam.P(b.x0, h, -11)];
    poly(ctx, p); ink(ctx, '#C9C2B6', LW(cam.k(0)) * 0.8);
  }
}

export function drawFacades(ctx, cam, t, heroState) {
  sideWalls(ctx, cam);
  roofTops(ctx, cam);
  const k = cam.plane(ctx, 0), u = 1 / k, lw = LW(k);
  const xmin = cam.X(-40, 0), xmax = cam.X(W + 40, 0);
  const balconies = [];
  for (const b of BUILDINGS) {
    if (b.x1 < xmin || b.x0 > xmax) continue;
    const top = GH + b.floors * FH;
    // wall
    ctx.beginPath(); ctx.rect(b.x0, 0, b.x1 - b.x0, top + 0.02); ctx.fillStyle = b.wall; ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = stuccoPattern(ctx); ctx.fill(); ctx.restore();
    // weathering: slightly deeper at street level
    const wg = ctx.createLinearGradient(0, 0, 0, 7);
    wg.addColorStop(0, 'rgba(90,80,70,0.10)'); wg.addColorStop(1, 'rgba(90,80,70,0)');
    ctx.fillStyle = wg; ctx.fillRect(b.x0, 0, b.x1 - b.x0, 7);
    // string courses
    for (let f = 0; f <= b.floors; f++) {
      const y = GH + f * FH;
      if (f === b.floors) break;
      rect(ctx, b.x0, y - 0.05, b.x1 - b.x0, 0.2, b.trim, lw * 0.8 * u);
      ctx.fillStyle = 'rgba(60,60,80,0.14)'; ctx.fillRect(b.x0, y - 0.14, b.x1 - b.x0, 0.09);
    }
    // quoins / building edges
    line(ctx, [[b.x0, 0], [b.x0, top]], lw * u);
    line(ctx, [[b.x1, 0], [b.x1, top]], lw * u);
    // upper windows
    const n = b.bays, bw = (b.x1 - b.x0) / n;
    for (let f = 0; f < b.floors; f++) {
      const y = GH + f * FH + 0.75;
      for (let i = 0; i < n; i++) {
        const w = b.style === 'modern' ? 1.55 : 1.12, h = b.style === 'modern' ? 1.9 : 2.05;
        const x = b.x0 + bw * (i + 0.5) - w / 2;
        const opts = { lintel: b.style !== 'modern', curtain: ((i + f) % 3) !== 1 };
        if (b.style === 'shutter' && (i + f) % 2 === 0) opts.shutters = b.shutter;
        if (b.style === 'hero') { opts.shutters = f % 2 === 0 ? b.shutter : null; }
        if ((b.style === 'classic' || b.style === 'hero') && f === 1 && i !== 1) opts.box = true, opts.flower = ['#D8A39B', '#E5C98F', '#C9B3D6'][(i + b.floors) % 3];
        windowBay(ctx, k, x, y, w, h, b, opts);
        if ((b.style === 'balcony' && f % 2 === 0) || (b.style === 'hero' && f === 0 && i === 1) || (b.style === 'classic' && f === 2 && i === 1)) balconies.push([x - 0.3, y - 0.05, w + 0.6]);
      }
    }
    roofline(ctx, cam, b, k);
  }
  // ground floors
  for (const b of BUILDINGS) {
    if (b.x1 < xmin || b.x0 > xmax) continue;
    cam.plane(ctx, 0);
    if (b.shop.kind === 'hero') drawHeroShop(ctx, cam, t, heroState);
    else drawShop(ctx, cam, t, b);
  }
  for (const b of BUILDINGS) {
    if (b.x1 < xmin - 2 || b.x0 > xmax + 2) continue;
    if (b.shop.kind === 'hero') { drawHeroShadow(ctx, cam, heroState); drawHeroAwning(ctx, cam, heroState); }
    else shopAwning(ctx, cam, b);
  }
  for (const [x, y, w] of balconies) balcony(ctx, cam, x, y, w);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ------------------------------------------------------------------ interiors (on a plane behind the glass → parallax)
const IZ = -2.6;
function interior(ctx, cam, t, kind, x0, x1, lit = 1, seed = 1) {
  const k = cam.plane(ctx, IZ), u = 1 / k, lw = LW(k, 0.8);
  const r = mulberry32(seed);
  const warmBack = mix(hex('#8F8C88'), hex('#F1DFC2'), lit);
  ctx.fillStyle = rgb(warmBack); ctx.fillRect(x0 - 3, 0, x1 - x0 + 6, GH);
  ctx.fillStyle = rgb(mix(hex('#77736E'), hex('#C9A987'), lit)); ctx.fillRect(x0 - 3, 0, x1 - x0 + 6, 0.35);
  const lamps = (xs, y) => {
    for (const x of xs) {
      line(ctx, [[x, GH], [x, y + 0.2]], lw * 0.6 * u);
      if (lit > 0.05) { const g = ctx.createRadialGradient(x, y, 0, x, y, 1.6); g.addColorStop(0, `rgba(255,214,150,${0.55 * lit})`); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2); }
      ell(ctx, x, y, 0.17, 0.17, rgb(mix(hex('#B9B3AA'), hex('#FFF1D6'), lit)), lw * 0.7 * u);
    }
  };
  if (kind === 'cafe') {
    for (let i = 0; i < 2; i++) { rect(ctx, x0 + 0.6, 1.75 + i * 0.55, x1 - x0 - 2.4, 0.05, '#7A5E48', 0); for (let j = 0; j < 8; j++) rect(ctx, x0 + 0.8 + j * 0.42, 1.8 + i * 0.55, 0.14, 0.2 + r() * 0.08, ['#E9E1D3', '#C7B299', '#8C6F58'][j % 3], lw * 0.4 * u); }
    rect(ctx, x0 + 0.2, 0, x1 - x0 - 1.2, 1.05, '#6D5646', lw * u); rect(ctx, x0 + 0.1, 1.05, x1 - x0 - 1.0, 0.08, '#4E3D33', lw * 0.8 * u);
    rect(ctx, x0 + 1.4, 1.13, 0.9, 0.55, '#B8BCBF', lw * u); rect(ctx, x0 + 1.5, 1.4, 0.7, 0.18, '#8E9396', 0);
    // barista
    ell(ctx, x0 + 3.3, 1.72, 0.12, 0.14, '#C99A7C', lw * 0.7 * u); rrectPath(ctx, x0 + 3.05, 1.05, 0.5, 0.58, 0.14); ink(ctx, '#EDE7DC', lw * 0.7 * u);
    rrectPath(ctx, x0 + 3.14, 1.05, 0.32, 0.5, 0.05); ink(ctx, '#3F5347', 0);
    ctx.fillStyle = '#3B302A'; ctx.beginPath(); ctx.ellipse(x0 + 3.29, 1.8, 0.13, 0.08, 0, Math.PI, TAU); ctx.fill();
    lamps([x0 + 1.3, x0 + 3.0, x0 + 4.6], 2.75);
  } else if (kind === 'books') {
    for (let s = 0; s < 4; s++) {
      const y = 0.5 + s * 0.72; rect(ctx, x0 - 1, y - 0.04, x1 - x0 + 2, 0.05, '#5A4A3E', 0);
      let x = x0 - 0.9;
      while (x < x1 + 0.9) { const w = 0.05 + r() * 0.06, h = 0.36 + r() * 0.22; rect(ctx, x, y, w, h, ['#8A5A4B', '#4F6475', '#C2A36E', '#6C7B5E', '#D8CFBF', '#7A6A8A'][(r() * 6) | 0], lw * 0.3 * u); x += w + 0.01 + (r() < 0.08 ? 0.3 : 0); }
    }
    lamps([x0 + 1.5, x0 + 4.5], 3.2);
  } else if (kind === 'florist') {
    ctx.fillStyle = '#7B9676';
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.ellipse(x0 - 0.5 + r() * (x1 - x0 + 1), 0.3 + r() * 2.6, 0.25 + r() * 0.3, 0.3 + r() * 0.3, r() * 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#5E7A5D';
    for (let i = 0; i < 25; i++) { ctx.beginPath(); ctx.ellipse(x0 + r() * (x1 - x0), 0.2 + r() * 1.8, 0.18, 0.3, r() * 3, 0, TAU); ctx.fill(); }
    lamps([x0 + 2.0, x0 + 4.4], 3.1);
  } else if (kind === 'optic') {
    for (let s = 0; s < 3; s++) { const y = 0.9 + s * 0.6; rect(ctx, x0, y, x1 - x0, 0.03, '#BDB8B0', 0); for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.55) { ctx.strokeStyle = '#3A3B40'; ctx.lineWidth = lw * 0.5 * u; ctx.beginPath(); ctx.ellipse(x - 0.07, y + 0.1, 0.06, 0.045, 0, 0, TAU); ctx.ellipse(x + 0.07, y + 0.1, 0.06, 0.045, 0, 0, TAU); ctx.stroke(); } }
    lamps([x0 + 2.5], 3.3);
  } else if (kind === 'grocer') {
    for (let s = 0; s < 3; s++) { const y = 0.4 + s * 0.7; for (let x = x0; x < x1; x += 0.3) ell(ctx, x, y + 0.1, 0.12, 0.1, ['#C9884F', '#B9503F', '#D8B14A', '#8BA05A'][(r() * 4) | 0], lw * 0.3 * u); }
    lamps([x0 + 2.5], 3.2);
  } else if (kind === 'gallery') {
    rect(ctx, x0 + 0.8, 1.2, 1.4, 1.1, '#D8C4A8', lw * u); rect(ctx, x0 + 3.0, 1.0, 1.0, 1.5, '#9AAAB4', lw * u);
    lamps([x0 + 1.5, x0 + 3.5], 3.4);
  } else if (kind === 'hero') {
    heroInterior(ctx, k, u, lw, x0, x1, lit, r);
  } else {
    rect(ctx, x0 + 0.5, 0.9, x1 - x0 - 1, 0.04, '#9D968B', 0);
  }
  cam.plane(ctx, 0);
}

function heroInterior(ctx, k, u, lw, x0, x1, lit, r) {
  // shelves of bread (back wall), a pastry counter, three globe pendants
  const wood = rgb(mix(hex('#6E6258'), hex('#9C7657'), lit));
  for (let s = 0; s < 3; s++) {
    const y = 1.45 + s * 0.62;
    rect(ctx, x0 - 1.2, y - 0.05, x1 - x0 + 2.4, 0.06, wood, lw * 0.5 * u);
    let x = x0 - 1.1; const rr = mulberry32(90 + s);
    while (x < x1 + 1.0) {
      const w = 0.26 + rr() * 0.14, h = 0.16 + rr() * 0.08;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 0.01, w / 2, h / 2, 0, 0, TAU);
      ink(ctx, rgb(mix(hex('#8C8278'), hex(['#C98D4E', '#D9A560', '#B87840'][(rr() * 3) | 0]), lit)), lw * 0.45 * u);
      ctx.strokeStyle = `rgba(255,240,210,${0.5 * lit})`; ctx.lineWidth = lw * 0.35 * u; ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.7); ctx.lineTo(x + w * 0.45, y + h * 0.35); ctx.moveTo(x + w * 0.55, y + h * 0.75); ctx.lineTo(x + w * 0.7, y + h * 0.4); ctx.stroke();
      x += w + 0.05;
    }
  }
  // counter with glass case
  const cx0 = x0 - 0.8, cx1 = x1 + 0.8;
  rect(ctx, cx0, 0, cx1 - cx0, 0.95, rgb(mix(hex('#5F6570'), hex('#2B3A58'), lit)), lw * u);
  ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.1 * lit})`; ctx.lineWidth = lw * 0.5 * u; ctx.beginPath();
  for (let x = cx0 + 0.6; x < cx1; x += 0.6) { ctx.moveTo(x, 0.12); ctx.lineTo(x, 0.83); } ctx.stroke();
  rect(ctx, cx0, 0.95, cx1 - cx0, 0.5, `rgba(220,235,240,${0.35 + 0.1 * lit})`, lw * 0.6 * u);
  const rr = mulberry32(77);
  for (let x = cx0 + 0.25; x < cx1 - 0.2; x += 0.42) {
    const kind = (rr() * 3) | 0;
    const c = ['#E8C9C2', '#F1E6D2', '#8A5A44'][kind];
    rect(ctx, x - 0.02, 1.0, 0.34, 0.03, '#E8E4DC', 0);
    rrectPath(ctx, x, 1.03, 0.3, 0.15 + kind * 0.03, 0.05); ink(ctx, rgb(mix(hex('#9A948C'), hex(c), lit)), lw * 0.4 * u);
    ell(ctx, x + 0.15, 1.2 + kind * 0.03, 0.03, 0.03, rgb(mix(hex('#8A8680'), hex('#C0504D'), lit)), 0);
  }
  // pendants
  for (const x of [x0 + 0.9, (x0 + x1) / 2, x1 - 0.9]) {
    line(ctx, [[x, GH], [x, 3.25]], lw * 0.5 * u);
    if (lit > 0.02) {
      const g = ctx.createRadialGradient(x, 3.1, 0, x, 3.1, 2.2);
      g.addColorStop(0, `rgba(255,220,160,${0.7 * lit})`); g.addColorStop(0.35, `rgba(255,210,150,${0.25 * lit})`); g.addColorStop(1, 'rgba(255,210,150,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 2.2, 0.9, 4.4, 4.4);
    }
    ell(ctx, x, 3.1, 0.2, 0.2, rgb(mix(hex('#A9A49C'), hex('#FFF4DC'), lit)), lw * 0.6 * u);
  }
}

// ------------------------------------------------------------------ ordinary shopfronts
function awningGeom(x0, x1, depth, yTop = 3.35, drop = 0.55) {
  return { x0, x1, Z: depth, y0: yTop, y1: yTop - drop * (depth / 1.35) };
}
export function drawAwning(ctx, cam, a, fill, stripe, valance = 0.24, alpha = 1) {
  if (a.Z < 0.02) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const p0 = cam.P(a.x0, a.y0, 0), p1 = cam.P(a.x1, a.y0, 0), p2 = cam.P(a.x1, a.y1, a.Z), p3 = cam.P(a.x0, a.y1, a.Z);
  const kf = cam.k(a.Z), lw = LW(kf);
  const under = cam.y < a.y1;
  ctx.save(); ctx.globalAlpha = alpha;
  poly(ctx, [p0, p1, p2, p3]);
  ctx.fillStyle = under ? tintS(fill, -0.28) : fill; ctx.fill();
  if (stripe) {
    ctx.save(); ctx.clip();
    const n = Math.round((a.x1 - a.x0) / 0.25);
    ctx.fillStyle = under ? tintS(stripe, -0.28) : stripe;
    for (let i = 0; i < n; i += 2) {
      const xa = a.x0 + (a.x1 - a.x0) * i / n, xb = a.x0 + (a.x1 - a.x0) * (i + 1) / n;
      poly(ctx, [cam.P(xa, a.y0, 0), cam.P(xb, a.y0, 0), cam.P(xb, a.y1, a.Z), cam.P(xa, a.y1, a.Z)]); ctx.fill();
    }
    ctx.restore();
  }
  poly(ctx, [p0, p1, p2, p3]); ink(ctx, null, lw * 0.9);
  // valance on the front plane
  const k = cam.plane(ctx, a.Z), u = 1 / k;
  const vh = valance * Math.min(1, a.Z / 0.6);
  rect(ctx, a.x0, a.y1 - vh, a.x1 - a.x0, vh, fill, lw * 0.9 * u);
  if (stripe) { ctx.fillStyle = stripe; const n = Math.round((a.x1 - a.x0) / 0.25); for (let i = 0; i < n; i += 2) ctx.fillRect(a.x0 + (a.x1 - a.x0) * i / n, a.y1 - vh, (a.x1 - a.x0) / n, vh); ctx.beginPath(); ctx.rect(a.x0, a.y1 - vh, a.x1 - a.x0, vh); ink(ctx, null, lw * 0.9 * u); }
  ctx.fillStyle = 'rgba(40,40,60,0.12)'; ctx.fillRect(a.x0, a.y1 - vh, a.x1 - a.x0, vh * 0.3);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function recess(ctx, cam, x0, x1, h, depth, floorCol, wallCol) {
  // door recess: floor + side reveals in perspective
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const lw = LW(cam.k(0)) * 0.8;
  poly(ctx, [cam.P(x0, 0, 0), cam.P(x1, 0, 0), cam.P(x1, 0, -depth), cam.P(x0, 0, -depth)]); ink(ctx, floorCol, lw);
  if (cam.x > x0) { poly(ctx, [cam.P(x0, 0, 0), cam.P(x0, h, 0), cam.P(x0, h, -depth), cam.P(x0, 0, -depth)]); ink(ctx, wallCol, lw); }
  if (cam.x < x1) { poly(ctx, [cam.P(x1, 0, 0), cam.P(x1, h, 0), cam.P(x1, h, -depth), cam.P(x1, 0, -depth)]); ink(ctx, tintS(wallCol, -0.08), lw); }
  poly(ctx, [cam.P(x0, h, 0), cam.P(x1, h, 0), cam.P(x1, h, -depth), cam.P(x0, h, -depth)]); ink(ctx, tintS(wallCol, -0.2), lw);
}

function glassOverlay(ctx, x, y, w, h, k, a = 1) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(190,205,214,${0.12 * a})`); g.addColorStop(0.7, `rgba(215,225,230,${0.28 * a})`); g.addColorStop(1, `rgba(236,240,240,${0.45 * a})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = `rgba(255,255,255,${0.18 * a})`;
  ctx.beginPath(); ctx.moveTo(x + w * 0.15, y + h); ctx.lineTo(x + w * 0.42, y + h); ctx.lineTo(x + w * 0.1, y); ctx.lineTo(x - w * 0.17, y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w * 0.52, y + h); ctx.lineTo(x + w * 0.6, y + h); ctx.lineTo(x + w * 0.28, y); ctx.lineTo(x + w * 0.2, y); ctx.fill();
  ctx.restore();
}

function drawShop(ctx, cam, t, b) {
  const s = b.shop, k = cam.k(0), u = 1 / k, lw = LW(k);
  const x0 = b.x0, x1 = b.x1, frame = s.frame;
  if (s.kind === 'plain') {
    // residential entrance: a panelled door and two small windows
    const dx = (x0 + x1) / 2;
    rect(ctx, x0, 0, x1 - x0, 0.45, tintS(b.wall, -0.1), lw * 0.8 * u);
    rect(ctx, dx - 0.7, 0, 1.4, 2.9, frame, lw * u);
    rect(ctx, dx - 0.55, 0.15, 0.5, 2.55, tintS(frame, 0.1), lw * 0.6 * u); rect(ctx, dx + 0.05, 0.15, 0.5, 2.55, tintS(frame, 0.1), lw * 0.6 * u);
    for (const wx of [x0 + 0.8, x1 - 2.0]) windowBay(ctx, k, wx, 1.2, 1.2, 1.9, b, { lintel: true });
    return;
  }
  const pil = 0.32, fy0 = 3.35, fy1 = 4.0;
  const doorW = 1.0, dx0 = s.door === 'left' ? x0 + pil + 0.15 : x1 - pil - 0.15 - doorW, dx1 = dx0 + doorW;
  const wins = s.door === 'left' ? [[dx1 + 0.2, x1 - pil]] : [[x0 + pil, dx0 - 0.2]];
  // interior behind glass (clip to the openings)
  ctx.save();
  ctx.beginPath();
  for (const [a, c] of wins) ctx.rect(a + 0.06, 0.62, c - a - 0.12, fy0 - 0.62 - 0.06);
  ctx.rect(dx0 + 0.1, 0.1, doorW - 0.2, 2.35);
  ctx.clip();
  interior(ctx, cam, t, s.kind, x0 + pil, x1 - pil, 1, (x0 * 13) | 0);
  ctx.restore();
  cam.plane(ctx, 0);
  // recess for the door
  ctx.save(); recess(ctx, cam, dx0, dx1, 2.55, 0.45, '#CFC6B8', tintS(frame, 0.55)); ctx.restore();
  cam.plane(ctx, 0);
  // door (set back) — drawn on the facade plane for simplicity, slightly inset
  {
    const kd = cam.plane(ctx, -0.45), ud = 1 / kd;
    ctx.save(); ctx.beginPath(); ctx.rect(dx0 + 0.08, 0.02, doorW - 0.16, 2.45); ctx.clip();
    interior(ctx, cam, t, s.kind, x0 + pil, x1 - pil, 1, (x0 * 13) | 0);
    ctx.restore(); cam.plane(ctx, -0.45);
    // the leaf swings inward on the hinge nearest the pilaster
    const ow = Math.cos(DOOR_OPEN(s.kind, t) * 1.25), full = doorW - 0.16, lw_ = full * ow;
    const hingeRight = s.door !== 'left';
    const lx0 = hingeRight ? dx1 - 0.08 - lw_ : dx0 + 0.08;
    if (ow < 0.999) { ctx.fillStyle = 'rgba(60,50,40,0.12)'; ctx.fillRect(dx0 + 0.08, 0.02, full, 2.45); }
    ctx.beginPath(); ctx.rect(lx0, 0.02, lw_, 2.45); ctx.rect(lx0 + 0.12 * ow, 0.3, lw_ - 0.24 * ow, 1.95);
    ctx.fillStyle = frame; ctx.fill('evenodd'); ctx.beginPath(); ctx.rect(lx0, 0.02, lw_, 2.45); ink(ctx, null, LW(kd) * ud);
    ctx.beginPath(); ctx.rect(lx0 + 0.12 * ow, 0.3, lw_ - 0.24 * ow, 1.95); ink(ctx, null, LW(kd) * 0.7 * ud);
    glassOverlay(ctx, lx0 + 0.12 * ow, 0.3, Math.max(0.01, lw_ - 0.24 * ow), 1.95, kd, 0.8);
    rect(ctx, hingeRight ? lx0 + 0.1 * ow : lx0 + lw_ - 0.15 * ow, 1.0, 0.05 * ow + 0.005, 0.35, '#C8A96A', LW(kd) * 0.4 * ud);
    cam.plane(ctx, 0);
  }
  // frame: pilasters, fascia, risers, mullions
  ctx.beginPath();
  ctx.rect(x0, 0, x1 - x0, GH);
  for (const [a, c] of wins) ctx.rect(a + 0.06, 0.62, c - a - 0.12, fy0 - 0.62 - 0.06);
  ctx.rect(dx0, 0, doorW, 2.55);
  ctx.fillStyle = frame; ctx.fill('evenodd');
  ctx.save(); ctx.globalAlpha = 0.1; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = stuccoPattern(ctx); ctx.fill('evenodd'); ctx.restore();
  // glass reflections over the windows
  for (const [a, c] of wins) {
    glassOverlay(ctx, a + 0.06, 0.62, c - a - 0.12, fy0 - 0.68, k);
    ctx.beginPath(); ctx.rect(a + 0.06, 0.62, c - a - 0.12, fy0 - 0.68); ink(ctx, null, lw * 0.8 * u);
    const tr = 2.62; line(ctx, [[a + 0.06, tr], [c - 0.06, tr]], lw * 0.8 * u);
    const n = Math.max(2, Math.round((c - a) / 1.3));
    for (let i = 1; i < n; i++) { const xx = a + (c - a) * i / n; line(ctx, [[xx, tr], [xx, fy0 - 0.06]], lw * 0.6 * u); }
    // riser panel
    ctx.beginPath(); ctx.rect(a + 0.15, 0.12, c - a - 0.3, 0.38); ink(ctx, null, lw * 0.6 * u, tintS(frame, 0.35));
  }
  // transom over door
  rect(ctx, dx0, 2.55, doorW, 0.06, frame, lw * 0.7 * u);
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, GH); ink(ctx, null, lw * u);
  line(ctx, [[x0 + pil, 0], [x0 + pil, fy0]], lw * 0.8 * u); line(ctx, [[x1 - pil, 0], [x1 - pil, fy0]], lw * 0.8 * u);
  // fascia & sign
  rect(ctx, x0 + pil, fy0, x1 - x0 - pil * 2, fy1 - fy0, tintS(frame, -0.05), lw * 0.9 * u);
  rect(ctx, x0 - 0.08, fy1, x1 - x0 + 0.16, 0.2, tintS(frame, 0.12), lw * 0.9 * u);
  ctx.fillStyle = 'rgba(40,40,60,0.2)'; ctx.fillRect(x0, fy1 - 0.08, x1 - x0, 0.08);
  const light = s.kind === 'optic';
  planeText(ctx, s.name, (x0 + x1) / 2, (fy0 + fy1) / 2 - 0.01, 0.34, s.kind === 'books' || s.kind === 'gallery' ? SERIF : SANS, light ? '#3A3B40' : '#F2EBDD', { spacing: 28 });
}

function shopAwning(ctx, cam, b) {
  const s = b.shop, x0 = b.x0, x1 = b.x1;
  if (!s.awning) return;
  cam.plane(ctx, 0);
  // its shadow falls on the shopfront (sun from the upper left)
  ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, GH); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(130,128,150,0.2)';
  ctx.beginPath(); ctx.moveTo(x0 + 0.05, 3.35); ctx.lineTo(x1 - 0.05, 3.35); ctx.lineTo(x1 + 0.3, 2.45); ctx.lineTo(x0 + 0.4, 2.45); ctx.closePath(); ctx.fill(); ctx.restore();
  drawAwning(ctx, cam, awningGeom(x0 + 0.05, x1 - 0.05, 1.35), s.awning, s.stripe || null);
}

// ------------------------------------------------------------------ the hero shop (ghost → drawn → alive)
// Geometry shared by the sketch, the blue trace and the final render.
export const HS = {
  x0: -3.25, x1: 3.25, pil: 0.36, fy0: 3.35, fy1: 4.02, top: 4.3,
  wl: [-2.89, -0.8], wr: [0.8, 2.89], wy0: 0.6, wy1: 3.3, tr: 2.58,
  d0: -0.62, d1: 0.62, dh: 2.52, dd: 0.7,
};
// trace paths (plane Z=0), with [start, end] fractions of the trace phase
export const TRACE = (() => {
  const { x0, x1, pil, fy0, fy1, top, wl, wr, wy0, wy1, tr, d0, d1, dh } = HS;
  const P = [];
  P.push({ pts: [[0, top], [x0 - 0.05, top], [x0 - 0.05, 0]], a: 0, b: 0.5, tip: true });
  P.push({ pts: [[0, top], [x1 + 0.05, top], [x1 + 0.05, 0]], a: 0, b: 0.5, tip: true });
  P.push({ pts: [[0, fy0], [x0 + pil, fy0], [x0 + pil, 0]], a: 0.18, b: 0.62 });
  P.push({ pts: [[0, fy0], [x1 - pil, fy0], [x1 - pil, 0]], a: 0.18, b: 0.62 });
  P.push({ pts: [[0, fy1], [x0 - 0.05, fy1]], a: 0.12, b: 0.4 });
  P.push({ pts: [[0, fy1], [x1 + 0.05, fy1]], a: 0.12, b: 0.4 });
  for (const [a, c] of [wl, wr]) {
    P.push({ pts: [[a, wy1], [c, wy1], [c, wy0], [a, wy0], [a, wy1]], a: 0.4, b: 0.85 });
    P.push({ pts: [[a, tr], [c, tr]], a: 0.55, b: 0.8 });
  }
  P.push({ pts: [[d0, 0], [d0, dh], [d1, dh], [d1, 0]], a: 0.45, b: 0.82 });
  P.push({ pts: [[d0, dh + 0.08], [d0, wy1], [d1, wy1], [d1, dh + 0.08]], a: 0.6, b: 0.9 });
  for (const P0 of P) { let L = 0; for (let i = 1; i < P0.pts.length; i++) L += Math.hypot(P0.pts[i][0] - P0.pts[i - 1][0], P0.pts[i][1] - P0.pts[i - 1][1]); P0.L = L; }
  return P;
})();

const HERO_FRAME = '#24324D', HERO_AWN = '#2C3C5E', HERO_TXT = '#EBDDBE';

function heroStructure(ctx, cam, t, st) {
  const { x0, x1, pil, fy0, fy1, top, wl, wr, wy0, wy1, tr, d0, d1, dh, dd } = HS;
  const k = cam.k(0), u = 1 / k, lw = LW(k);
  // interior (lit amount) behind glass
  ctx.save(); ctx.beginPath();
  for (const [a, c] of [wl, wr]) ctx.rect(a, wy0, c - a, wy1 - wy0);
  ctx.rect(d0, dh + 0.08, d1 - d0, wy1 - dh - 0.08);
  ctx.clip(); interior(ctx, cam, t, 'hero', x0 + pil, x1 - pil, st.lights, 5); ctx.restore();
  cam.plane(ctx, 0);
  // door recess
  recess(ctx, cam, d0, d1, dh, dd, '#D9D2C6', '#DCD3C4');
  // checker tiles in recess floor
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) {
    const xa = d0 + (d1 - d0) * i / 6, xb = d0 + (d1 - d0) * (i + 1) / 6, za = -dd * j / 3, zb = -dd * (j + 1) / 3;
    poly(ctx, [cam.P(xa, 0.001, za), cam.P(xb, 0.001, za), cam.P(xb, 0.001, zb), cam.P(xa, 0.001, zb)]); ctx.fillStyle = 'rgba(36,50,77,0.55)'; ctx.fill();
  }
  // the door, set back
  const kd = cam.plane(ctx, -dd), ud = 1 / kd;
  ctx.save(); ctx.beginPath(); ctx.rect(d0 + 0.08, 0.02, d1 - d0 - 0.16, dh - 0.04); ctx.clip();
  interior(ctx, cam, t, 'hero', x0 + pil, x1 - pil, st.lights, 5); ctx.restore(); cam.plane(ctx, -dd);
  // the leaf swings inward on its right-hand hinge
  const ow = Math.cos((st.door || 0) * 1.25), lx1 = d1 - 0.06, lx0 = lx1 - (d1 - d0 - 0.12) * ow, lwid = lx1 - lx0;
  if ((st.door || 0) > 0.01) { ctx.fillStyle = 'rgba(60,50,40,0.12)'; ctx.fillRect(d0 + 0.06, 0.02, lx0 - d0 - 0.06, dh - 0.04); }
  ctx.beginPath(); ctx.rect(lx0, 0.02, lwid, dh - 0.04); ctx.rect(lx0 + 0.14 * ow, 0.34, lwid - 0.28 * ow, dh - 0.55);
  ctx.fillStyle = HERO_FRAME; ctx.fill('evenodd');
  ctx.beginPath(); ctx.rect(lx0, 0.02, lwid, dh - 0.04); ink(ctx, null, LW(kd) * ud);
  ctx.beginPath(); ctx.rect(lx0 + 0.14 * ow, 0.34, lwid - 0.28 * ow, dh - 0.55); ink(ctx, null, LW(kd) * 0.7 * ud);
  glassOverlay(ctx, lx0 + 0.14 * ow, 0.34, Math.max(0.01, lwid - 0.28 * ow), dh - 0.55, kd, st.glass);
  rect(ctx, lx0 + 0.08 * ow, 0.95, 0.05 * ow + 0.01, 0.5, '#C9A866', LW(kd) * 0.4 * ud);
  cam.plane(ctx, 0);
  // frame
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, top);
  for (const [a, c] of [wl, wr]) ctx.rect(a, wy0, c - a, wy1 - wy0);
  ctx.rect(d0, 0, d1 - d0, dh); ctx.rect(d0, dh + 0.08, d1 - d0, wy1 - dh - 0.08);
  ctx.fillStyle = HERO_FRAME; ctx.fill('evenodd');
  ctx.save(); ctx.globalAlpha = 0.12; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = stuccoPattern(ctx); ctx.fill('evenodd'); ctx.restore();
  // pilaster capitals and bases
  for (const px of [x0, x1 - pil]) {
    rect(ctx, px - 0.04, fy0 - 0.12, pil + 0.08, 0.12, tintS(HERO_FRAME, 0.12), lw * 0.7 * u);
    rect(ctx, px - 0.03, 0, pil + 0.06, 0.28, tintS(HERO_FRAME, -0.15), lw * 0.7 * u);
    ctx.beginPath(); ctx.rect(px + 0.08, 0.4, pil - 0.16, fy0 - 0.65); ink(ctx, null, lw * 0.5 * u, tintS(HERO_FRAME, 0.3));
  }
  // risers
  for (const [a, c] of [wl, wr]) { ctx.beginPath(); ctx.rect(a + 0.12, 0.12, c - a - 0.24, wy0 - 0.24); ink(ctx, null, lw * 0.6 * u, tintS(HERO_FRAME, 0.3)); }
  // fascia + cornice
  rect(ctx, x0 + pil, fy0, x1 - x0 - 2 * pil, fy1 - fy0, tintS(HERO_FRAME, -0.06), lw * 0.9 * u);
  rect(ctx, x0 - 0.1, fy1, x1 - x0 + 0.2, 0.12, tintS(HERO_FRAME, 0.1), lw * 0.8 * u);
  rect(ctx, x0 - 0.16, fy1 + 0.12, x1 - x0 + 0.32, top - fy1 - 0.12, tintS(HERO_FRAME, 0.18), lw * 0.9 * u);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x0 - 0.16, top - 0.04, x1 - x0 + 0.32, 0.03);
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, top); ink(ctx, null, lw * u);
}

function heroGlass(ctx, cam, st) {
  const { wl, wr, wy0, wy1, tr, d0, d1, dh } = HS;
  const k = cam.k(0), u = 1 / k, lw = LW(k);
  for (const [a, c] of [wl, wr]) {
    glassOverlay(ctx, a, wy0, c - a, wy1 - wy0, k, 0.35 + 0.65 * st.glass);
    // the sweep of a highlight across the glass as it "arrives"
    if (st.sweep > 0 && st.sweep < 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(a, wy0, c - a, wy1 - wy0); ctx.clip();
      const sx = lerp(-3.5, 4.5, st.sweep);
      const g = ctx.createLinearGradient(sx - 0.8, 0, sx + 0.8, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - 0.8, wy0); ctx.lineTo(sx + 0.8, wy0); ctx.lineTo(sx + 1.6, wy1); ctx.lineTo(sx, wy1); ctx.fill();
      ctx.restore();
    }
    // mullions
    line(ctx, [[a, tr], [c, tr]], lw * 0.8 * u);
    for (let i = 1; i < 3; i++) { const xx = a + (c - a) * i / 3; line(ctx, [[xx, tr], [xx, wy1]], lw * 0.6 * u); }
    ctx.beginPath(); ctx.rect(a, wy0, c - a, wy1 - wy0); ink(ctx, null, lw * 0.85 * u);
  }
  glassOverlay(ctx, d0, dh + 0.08, d1 - d0, wy1 - dh - 0.08, k, 0.35 + 0.65 * st.glass);
  ctx.beginPath(); ctx.rect(d0, dh + 0.08, d1 - d0, wy1 - dh - 0.08); ink(ctx, null, lw * 0.7 * u);
  ctx.beginPath(); ctx.rect(d0, 0, d1 - d0, dh); ink(ctx, null, lw * 0.9 * u);
}

function heroSign(ctx, cam, st) {
  const { x0, x1, pil, fy0, fy1 } = HS;
  const k = cam.k(0), u = 1 / k, lw = LW(k);
  const cy = (fy0 + fy1) / 2;
  // letters resolve from the centre outward
  const word = 'PASTANE';
  ctx.save();
  ctx.font = '500 100px "Fraunces"'; ctx.letterSpacing = '34px';
  const s = 0.36 / 100; const wpx = ctx.measureText(word).width - 34;
  ctx.restore();
  const W0 = wpx * 0.36 / 100;
  const n = word.length;
  let x = -W0 / 2;
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.font = '500 100px "Fraunces"'; const cw = ctx.measureText(word[i]).width * 0.36 / 100; ctx.restore();
    const dist = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
    const a = clamp((st.sign * 1.6 - dist * 0.6));
    if (a > 0) {
      ctx.save(); ctx.globalAlpha *= easeO(a);
      planeText(ctx, word[i], x + cw / 2, cy - 0.015 - (1 - easeO(a)) * 0.05, 0.36, '500 {s} "Fraunces"', HERO_TXT);
      ctx.restore();
    }
    x += cw + 0.34 * 0.34;
  }
  // small rules either side
  const ra = clamp(st.sign * 1.4 - 0.4);
  if (ra > 0) {
    ctx.save(); ctx.globalAlpha *= ra;
    line(ctx, [[-W0 / 2 - 0.25 - 0.45 * ra, cy], [-W0 / 2 - 0.25, cy]], lw * 0.6 * u, HERO_TXT);
    line(ctx, [[W0 / 2 + 0.25, cy], [W0 / 2 + 0.25 + 0.45 * ra, cy]], lw * 0.6 * u, HERO_TXT);
    ctx.restore();
  }
}

function heroLamps(ctx, cam, st) {
  // two gooseneck lamps above the fascia, washing the sign in warm light
  const { top, fy0, fy1 } = HS;
  const k = cam.k(0), u = 1 / k, lw = LW(k);
  for (const x of [-2.1, 2.1]) {
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 0.9 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, top + 0.18); ctx.quadraticCurveTo(x, top + 0.5, x + 0.0, top + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 0.16, top + 0.42); ctx.lineTo(x + 0.16, top + 0.42); ctx.lineTo(x + 0.1, top + 0.56); ctx.lineTo(x - 0.1, top + 0.56); ctx.closePath(); ink(ctx, HERO_FRAME, lw * 0.7 * u);
    if (st.lights > 0) {
      const g = ctx.createRadialGradient(x, fy1, 0, x, fy1, 1.3);
      g.addColorStop(0, `rgba(255,226,170,${0.35 * st.lights})`); g.addColorStop(1, 'rgba(255,226,170,0)');
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x - 1.3, fy0 - 0.3, 2.6, 1.6); ctx.restore();
    }
  }
}

function heroSketch(ctx, cam, a) {
  // the ghost: a faint, colourless under-drawing of what should be here
  if (a <= 0) return;
  const k = cam.k(0), u = 1 / k;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = '#8D8E92'; ctx.lineWidth = LW(k, 0.6) * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of TRACE) { ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); for (let i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]); ctx.stroke(); }
  ctx.restore();
}

export function drawHeroShop(ctx, cam, t, st) {
  const k = cam.k(0), u = 1 / k, lw = LW(k);
  const { x0, x1, top } = HS;
  // the building's wall continues down where the shop should be — the gap is there, the shop isn't
  const wall = HERO.wall;
  ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, top); ctx.fillStyle = wall; ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = stuccoPattern(ctx); ctx.fill(); ctx.restore();
  const wg = ctx.createLinearGradient(0, 0, 0, 5); wg.addColorStop(0, 'rgba(90,80,70,0.08)'); wg.addColorStop(1, 'rgba(90,80,70,0)'); ctx.fillStyle = wg; ctx.fillRect(x0, 0, x1 - x0, 5);
  // a faint translucent hint of the shop (present as a place, absent as a presence)
  if (st.ghost > 0) {
    const L = scratch(6); const g = L.g;
    heroStructure(g, cam, t, { lights: 0, glass: 0, sweep: 0 });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.07 * st.ghost; ctx.filter = 'grayscale(1) blur(0.6px)'; ctx.drawImage(L, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.28 * st.ghost; ctx.fillStyle = '#FBF8F2'; ctx.fillRect(HS.x0, 0, HS.x1 - HS.x0, HS.top); ctx.restore();
    heroSketch(ctx, cam, 0.3 * st.ghost);
  }
  // the real shop, layer by layer
  if (st.frame > 0) {
    const L = scratch(6); const g = L.g;
    const camL = cam;
    g.setTransform(ctx.getTransform());
    heroStructure(g, camL, t, st);
    // the ink outlines arrive with the trace; before that the fills are soft
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = st.frame; ctx.drawImage(L, 0, 0); ctx.restore();
  }
  if (st.frame > 0.05) {
    ctx.save(); ctx.globalAlpha = clamp(st.frame * 1.4); heroGlass(ctx, cam, st); ctx.restore();
  }
  if (st.sign > 0) heroSign(ctx, cam, st);
  if (st.frame > 0.2) { ctx.save(); ctx.globalAlpha = clamp((st.frame - 0.2) / 0.5); heroLamps(ctx, cam, st); ctx.restore(); }
}

// the awning is drawn after the facade shadows so it can unfold over them
export function drawHeroAwning(ctx, cam, st) {
  if (st.awning <= 0) return;
  const d = 1.35 * easeIO(st.awning);
  const a = awningGeom(HS.x0 - 0.05, HS.x1 + 0.05, d, 3.42);
  drawAwning(ctx, cam, a, HERO_AWN, '#34466B', 0.26, clamp(st.awning * 3));
  // cream piping on the valance
  if (d > 0.2) {
    const k = cam.plane(ctx, d), u = 1 / k;
    const vh = 0.26 * Math.min(1, d / 0.6);
    ctx.save(); ctx.globalAlpha = clamp(st.awning * 2 - 0.5);
    line(ctx, [[a.x0 + 0.05, a.y1 - vh + 0.06], [a.x1 - 0.05, a.y1 - vh + 0.06]], LW(k, 0.5) * u, HERO_TXT);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

// ------------------------------------------------------------------ hero awning shadow on the shopfront
export function drawHeroShadow(ctx, cam, st) {
  if (!st || st.awning <= 0) return;
  cam.plane(ctx, 0);
  const e = easeIO(st.awning);
  ctx.save(); ctx.beginPath(); ctx.rect(HS.x0, 0, HS.x1 - HS.x0, GH); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(130,128,150,0.2)';
  ctx.beginPath(); ctx.moveTo(HS.x0, 3.42); ctx.lineTo(HS.x1, 3.42); ctx.lineTo(HS.x1 + 0.3 * e, 3.42 - 0.95 * e); ctx.lineTo(HS.x0 + 0.4 * e, 3.42 - 0.95 * e); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ------------------------------------------------------------------ ground
export function drawGround(ctx, cam, t, st) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const Xa = cam.X(-400, 1) - 20, Xb = cam.X(W + 400, 1) + 20;
  const Q = (x0, x1, z0, z1, y = 0) => [cam.P(x0, y, z0), cam.P(x1, y, z0), cam.P(x1, y, z1), cam.P(x0, y, z1)];
  const zNear = Math.min(cam.z - 0.4, 40);
  // far pavement
  poly(ctx, Q(Xa, Xb, 0, CURB)); ctx.fillStyle = PAL.paving; ctx.fill();
  // paving joints
  ctx.strokeStyle = 'rgba(120,110,100,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let z = 0.6; z < CURB; z += 0.6) { const a = cam.P(Xa, 0, z), b = cam.P(Xb, 0, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let x = Math.floor(Xa); x < Xb; x += 0.9) { const a = cam.P(x, 0, 0), b = cam.P(x, 0, CURB); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  // facade base line (soft AO)
  { const a = cam.P(Xa, 0, 0), b = cam.P(Xb, 0, 0.35); const g = ctx.createLinearGradient(0, a[1], 0, b[1]); g.addColorStop(0, 'rgba(70,70,90,0.22)'); g.addColorStop(1, 'rgba(70,70,90,0)'); ctx.fillStyle = g; poly(ctx, Q(Xa, Xb, 0, 0.35)); ctx.fill(); }
  // shop light spilling on the pavement
  for (const b of BUILDINGS) {
    let a = b.shop.kind === 'hero' ? (st ? st.lights : 0) : (b.shop.kind === 'plain' ? 0 : 0.55);
    if (a <= 0) continue;
    const x0 = b.x0 + 0.4, x1 = b.x1 - 0.4;
    const p = Q(x0, x1, 0, 2.2);
    const g = ctx.createLinearGradient(0, p[0][1], 0, p[2][1]);
    g.addColorStop(0, `rgba(255,222,170,${0.28 * a})`); g.addColorStop(1, 'rgba(255,222,170,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(cam.P(x1 + 0.8, 0, 2.2)[0], p[2][1]); ctx.lineTo(cam.P(x0 - 0.8, 0, 2.2)[0], p[3][1]); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // kerb
  poly(ctx, Q(Xa, Xb, CURB, CURB + 0.22, 0.14)); ctx.fillStyle = '#E4DED3'; ctx.fill();
  poly(ctx, [cam.P(Xa, 0.14, CURB + 0.22), cam.P(Xb, 0.14, CURB + 0.22), cam.P(Xb, 0, CURB + 0.22), cam.P(Xa, 0, CURB + 0.22)]); ctx.fillStyle = PAL.curb; ctx.fill();
  line(ctx, [cam.P(Xa, 0.14, CURB + 0.22), cam.P(Xb, 0.14, CURB + 0.22)], LW(cam.k(CURB)) * 0.8);
  line(ctx, [cam.P(Xa, 0.14, CURB), cam.P(Xb, 0.14, CURB)], LW(cam.k(CURB)) * 0.5, 'rgba(43,44,49,0.5)');
  // road
  if (zNear > CURB + 0.22) {
    const zr = Math.min(ROAD1, zNear);
    const p = Q(Xa, Xb, CURB + 0.22, zr);
    const g = ctx.createLinearGradient(0, p[0][1], 0, p[2][1]);
    g.addColorStop(0, '#B0ACA5'); g.addColorStop(1, '#A09C95');
    poly(ctx, p); ctx.fillStyle = g; ctx.fill();
    ctx.save(); poly(ctx, p); ctx.clip(); ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'multiply';
    const pat = ctx.createPattern(STUCCO || (STUCCO = grainTile(256, 11, 1.0)), 'repeat'); pat.setTransform(new DOMMatrix().scale(0.8)); ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
    // gutter line + lane markings
    const lm = (z0, z1, dash) => {
      ctx.fillStyle = 'rgba(246,244,238,0.85)';
      if (!dash) { poly(ctx, Q(Xa, Xb, z0, z1, 0.002)); ctx.fill(); return; }
      for (let x = Math.floor(Xa / 4) * 4; x < Xb; x += 4) { poly(ctx, Q(x, x + 2, z0, z1, 0.002)); ctx.fill(); }
    };
    lm(CURB + 0.5, CURB + 0.6, false);
    if (zr > 7.6) lm(7.4, 7.55, true);
    if (zr > ROAD1 - 0.5) lm(ROAD1 - 0.6, ROAD1 - 0.5, false);
  }
  // near kerb + pavement
  if (zNear > ROAD1) {
    poly(ctx, Q(Xa, Xb, ROAD1, Math.min(ROAD1 + 0.22, zNear), 0.14)); ctx.fillStyle = '#E4DED3'; ctx.fill();
    line(ctx, [cam.P(Xa, 0.14, ROAD1), cam.P(Xb, 0.14, ROAD1)], LW(cam.k(ROAD1)) * 0.8);
    if (zNear > ROAD1 + 0.22) {
      poly(ctx, Q(Xa, Xb, ROAD1 + 0.22, zNear, 0.14)); ctx.fillStyle = PAL.paving; ctx.fill();
      ctx.strokeStyle = 'rgba(120,110,100,0.2)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let z = ROAD1 + 0.8; z < zNear; z += 0.6) { const a = cam.P(Xa, 0.14, z), b = cam.P(Xb, 0.14, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------------ street furniture (sortable by Z)
export function streetProps() {
  const items = [];
  // café tables and chairs
  for (const [x, z] of [[-8.9, 1.15], [-6.5, 1.15]]) items.push({ z, draw: (ctx, cam, t) => bistro(ctx, cam, x, z) });
  // florist stands
  items.push({ z: 0.7, draw: (ctx, cam) => flowerStand(ctx, cam, -12.4, 0.7) });
  items.push({ z: 0.6, draw: (ctx, cam) => crates(ctx, cam, -21.4, 0.6) });
  // trees at the kerb and lamp posts
  for (const x of [-10.1, 10.2]) items.push({ z: 3.3, draw: (ctx, cam, t) => tree(ctx, cam, x, 3.3, t) });
  for (const x of [-16.6, 16.6]) items.push({ z: 3.45, draw: (ctx, cam) => lampPost(ctx, cam, x, 3.45) });
  // bench outside the bookshop
  items.push({ z: 0.55, draw: (ctx, cam) => bench(ctx, cam, 6.3, 0.55) });
  return items;
}

function onPlane(ctx, cam, Z) { const k = cam.plane(ctx, Z); return { k, u: 1 / k, lw: LW(k) }; }

function bistro(ctx, cam, x, z) {
  const { u, lw } = onPlane(ctx, cam, z);
  // chairs either side
  for (const s of [-1, 1]) {
    const cx = x + s * 0.55;
    line(ctx, [[cx + 0.18 * s, 0], [cx + 0.18 * s, 0.9]], lw * 1.1 * u, '#2F3A35');
    line(ctx, [[cx - 0.18 * s, 0], [cx - 0.18 * s, 0.46]], lw * 1.1 * u, '#2F3A35');
    rect(ctx, cx - 0.22, 0.44, 0.44, 0.05, '#2F3A35', lw * 0.6 * u);
    ctx.strokeStyle = '#2F3A35'; ctx.lineWidth = lw * 0.8 * u; ctx.beginPath(); ctx.moveTo(cx + 0.18 * s, 0.9); ctx.quadraticCurveTo(cx + 0.3 * s, 0.7, cx + 0.18 * s, 0.5); ctx.stroke();
  }
  line(ctx, [[x, 0], [x, 0.72]], lw * 1.3 * u, '#2F3A35');
  line(ctx, [[x - 0.2, 0.01], [x + 0.2, 0.01]], lw * 1.2 * u, '#2F3A35');
  rect(ctx, x - 0.33, 0.72, 0.66, 0.05, '#E8E3D9', lw * 0.8 * u);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function flowerStand(ctx, cam, x, z) {
  const { u, lw } = onPlane(ctx, cam, z);
  const r = mulberry32(5);
  for (let tier = 0; tier < 2; tier++) {
    const y = 0.35 + tier * 0.4, n = 5 - tier;
    for (let i = 0; i < n; i++) {
      const bx = x + (i - (n - 1) / 2) * 0.42;
      const fc = ['#D9A7A0', '#EDE3CF', '#E3C487', '#B7A5C9', '#D98F7E'][(r() * 5) | 0];
      ctx.fillStyle = '#6E896B'; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(bx + (r() - 0.5) * 0.2, y + 0.3 + r() * 0.1, 0.1, 0.16, 0, 0, TAU); ctx.fill(); }
      for (let j = 0; j < 6; j++) ell(ctx, bx + (r() - 0.5) * 0.26, y + 0.36 + r() * 0.16, 0.06, 0.06, fc, lw * 0.3 * u);
      rrectPath(ctx, bx - 0.14, y, 0.28, 0.26, 0.03); ink(ctx, '#9BA3A6', lw * 0.6 * u);
    }
    rect(ctx, x - 1.1, y - 0.04, 2.2, 0.04, '#7A6553', lw * 0.6 * u);
  }
  line(ctx, [[x - 1.0, 0], [x - 1.0, 0.75]], lw * 0.9 * u, '#7A6553'); line(ctx, [[x + 1.0, 0], [x + 1.0, 0.75]], lw * 0.9 * u, '#7A6553');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function crates(ctx, cam, x, z) {
  const { u, lw } = onPlane(ctx, cam, z);
  const r = mulberry32(8);
  for (let i = 0; i < 4; i++) {
    const bx = x + i * 0.55 - 0.8, c = ['#C9884F', '#B9503F', '#D8B14A', '#8BA05A'][i];
    for (let j = 0; j < 5; j++) ell(ctx, bx + 0.07 + j * 0.09, 0.62 + r() * 0.03, 0.06, 0.055, c, lw * 0.3 * u);
    rect(ctx, bx, 0.3, 0.5, 0.3, '#B89468', lw * 0.7 * u);
  }
  rect(ctx, x - 0.85, 0, 2.3, 0.3, '#8C6F55', lw * 0.7 * u);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function bench(ctx, cam, x, z) {
  const { u, lw } = onPlane(ctx, cam, z);
  rect(ctx, x - 0.8, 0.42, 1.6, 0.07, '#8A6E56', lw * 0.7 * u);
  rect(ctx, x - 0.8, 0.62, 1.6, 0.07, '#8A6E56', lw * 0.7 * u);
  rect(ctx, x - 0.8, 0.8, 1.6, 0.07, '#8A6E56', lw * 0.7 * u);
  for (const s of [-1, 1]) line(ctx, [[x + s * 0.65, 0], [x + s * 0.65, 0.87]], lw * 1.1 * u, '#33363B');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function lampPost(ctx, cam, x, z) {
  const { u, lw } = onPlane(ctx, cam, z);
  const c = '#2F3136';
  rect(ctx, x - 0.07, 0, 0.14, 0.5, c, lw * 0.6 * u);
  line(ctx, [[x, 0.5], [x, 4.6]], lw * 1.6 * u, c);
  ctx.beginPath(); ctx.moveTo(x - 0.22, 4.6); ctx.lineTo(x + 0.22, 4.6); ctx.lineTo(x + 0.15, 5.15); ctx.lineTo(x - 0.15, 5.15); ctx.closePath(); ink(ctx, '#EDE7DA', lw * 0.8 * u);
  ctx.beginPath(); ctx.moveTo(x - 0.27, 5.15); ctx.lineTo(x + 0.27, 5.15); ctx.lineTo(x, 5.4); ctx.closePath(); ink(ctx, c, lw * 0.7 * u);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
export function tree(ctx, cam, x, z, t, blur = 0) {
  const { k, u, lw } = onPlane(ctx, cam, z);
  const r = mulberry32((x * 17) | 0);
  ctx.save(); if (blur) ctx.filter = `blur(${blur}px)`;
  // trunk
  ctx.beginPath(); ctx.moveTo(x - 0.13, 0); ctx.lineTo(x - 0.09, 3.2); ctx.lineTo(x + 0.09, 3.2); ctx.lineTo(x + 0.14, 0); ctx.closePath(); ink(ctx, '#7D6A5A', lw * u);
  line(ctx, [[x, 2.6], [x - 0.6, 3.6]], lw * 1.3 * u, '#7D6A5A'); line(ctx, [[x, 2.9], [x + 0.55, 3.8]], lw * 1.2 * u, '#7D6A5A');
  // tree pit
  rect(ctx, x - 0.55, -0.01, 1.1, 0.03, '#5E5A55', 0);
  // canopy: clustered, gently moving leaves
  const sway = Math.sin(t * 0.9 + x) * 0.05;
  const blobs = [];
  for (let i = 0; i < 16; i++) { const a = r() * TAU, d = Math.sqrt(r()); blobs.push([x + Math.cos(a) * d * 1.55, 5.0 + Math.sin(a) * d * 1.3, 0.55 + r() * 0.45]); }
  ctx.beginPath(); for (const [bx, by, br] of blobs) { ctx.moveTo(bx + sway + br, by); ctx.ellipse(bx + sway * (by - 3) / 2, by, br, br * 0.88, 0, 0, TAU); }
  ctx.fillStyle = '#869E80'; ctx.fill();
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 2 * u; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(40,60,50,0.18)';
  ctx.beginPath(); for (const [bx, by, br] of blobs) { if (by > 5.0) continue; ctx.moveTo(bx + br * 0.9, by - br * 0.2); ctx.ellipse(bx + sway * (by - 3) / 2, by - br * 0.2, br * 0.85, br * 0.6, 0, 0, TAU); } ctx.fill();
  ctx.fillStyle = 'rgba(255,245,215,0.22)';
  ctx.beginPath(); for (const [bx, by, br] of blobs) { if (by < 5.3) continue; ctx.moveTo(bx + br * 0.4, by + br * 0.35); ctx.ellipse(bx - br * 0.2 + sway * (by - 3) / 2, by + br * 0.35, br * 0.5, br * 0.35, 0, 0, TAU); } ctx.fill();
  // leaf flecks
  ctx.fillStyle = 'rgba(52,72,58,0.35)';
  for (let i = 0; i < 40; i++) { const bx = x + (r() - 0.5) * 3.2 + sway, by = 4.0 + r() * 2.4; ctx.beginPath(); ctx.ellipse(bx, by, 0.07, 0.04, r() * 3, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ------------------------------------------------------------------ light: the street sits in the soft shade of the buildings behind the camera
export function shadeLineY(X) { return 4.75 + 0.18 * Math.sin(X * 0.23) + ((Math.floor((X + 40) / 7) % 3) === 1 ? 0.22 : 0); }
export function drawSunAndShade(ctx, cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // polygon: everything below the shade line on the facade plane
  const pts = [];
  for (let sx = -40; sx <= W + 40; sx += 30) { const X = cam.X(sx, 0); pts.push(cam.P(X, shadeLineY(X), 0)); }
  ctx.save();
  // warm sunlight above the line
  ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(W + 40, -40); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,206,150,0.5)'; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(W + 40, H + 40); ctx.lineTo(-40, H + 40); ctx.closePath();
  ctx.filter = `blur(${clamp(cam.k(0) * 0.03, 1, 6).toFixed(1)}px)`;
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(232,230,236,1)'; ctx.fill();
  ctx.restore();
}
