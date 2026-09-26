// Street life and weather: bollards, planters with olive trees, overhead cables, a distant dome,
// manhole steam, moths at the lanterns, a fine drizzle lit by the lamps, and ripples on the wet stone.
import { W, H, clamp, lerp, TAU, mulberry32, hex, rgb, mix, fogged, FOG, line3, fillPoly, projectPoly, pathPoly, glow, noise1 } from './engine.js';

// --- street furniture (world positions)
export const BOLLARDS = [];
for (let z = 6; z > -64; z -= 5.5) { BOLLARDS.push([-3.05, z]); BOLLARDS.push([3.05, z - 2.7]); }
export const PLANTERS = [[-2.85, -9.5], [2.85, -24.5], [-2.85, -34], [2.85, -58.5], [13.5, -48.3], [26, -46.6]];
export const CABLES = [-10.5, -26, -43.5, -72];
export const STEAM = [[0.9, -31.5], [24.5, -47.6]];

function bollard(ctx, cam, x, z) {
  const b = cam.project([x, 0, z]), t = cam.project([x, 0.85, z]);
  if (b[2] <= 0.3) return;
  const s = cam.scaleAt([x, 0.4, z]), w = s * 0.075, d = cam.depth([x, 0.4, z]);
  const col = rgb(fogged(hex('#1a1b1e'), d));
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(b[0] - w, t[1], w * 2, b[1] - t[1], [w, w, 2, 2]); ctx.fill();
  ctx.fillStyle = `rgba(255,200,140,${(0.25 * Math.exp(-d * 0.04)).toFixed(3)})`; ctx.fillRect(b[0] - w * 0.2, t[1] + w * 0.3, w * 0.35, (b[1] - t[1]) * 0.8);
  ctx.fillStyle = rgb(fogged(hex('#2b2c30'), d)); ctx.fillRect(b[0] - w * 1.05, t[1] + (b[1] - t[1]) * 0.15, w * 2.1, Math.max(1, s * 0.02));
}
function planter(ctx, cam, x, z, seed) {
  const r = mulberry32(seed);
  const d = cam.depth([x, 0.5, z]);
  if (d <= 0.4) return;
  const pot = (y0, y1, hw, col) => fillPoly(ctx, cam, [[x - hw, y0, z + hw * (x < 0 ? 0 : 0)], [x + hw, y0, z], [x + hw * 0.92, y1, z], [x - hw * 0.92, y1, z]], col);
  const faceZ = cam.pos[2] > z ? z + 0.35 : z - 0.35;
  fillPoly(ctx, cam, [[x - 0.35, 0, faceZ], [x + 0.35, 0, faceZ], [x + 0.35, 0.62, faceZ], [x - 0.35, 0.62, faceZ]], rgb(fogged(hex('#4a4640'), d)));
  const faceX = cam.pos[0] > x ? x + 0.35 : x - 0.35;
  fillPoly(ctx, cam, [[faceX, 0, z - 0.35], [faceX, 0, z + 0.35], [faceX, 0.62, z + 0.35], [faceX, 0.62, z - 0.35]], rgb(fogged(hex('#3a3632'), d)));
  fillPoly(ctx, cam, [[x - 0.35, 0.62, z - 0.35], [x + 0.35, 0.62, z - 0.35], [x + 0.35, 0.62, z + 0.35], [x - 0.35, 0.62, z + 0.35]], rgb(fogged(hex('#57524b'), d)));
  // olive tree: slender trunk + clustered, silvery-dark foliage
  line3(ctx, cam, [x, 0.62, z], [x + 0.05, 1.7, z], rgb(fogged(hex('#2c241d'), d)), Math.max(1, cam.scaleAt([x, 1, z]) * 0.05));
  line3(ctx, cam, [x + 0.05, 1.5, z], [x - 0.2, 1.95, z], rgb(fogged(hex('#2c241d'), d)), Math.max(1, cam.scaleAt([x, 1, z]) * 0.03));
  for (let k = 0; k < 26; k++) {
    const p = cam.project([x + (r() - 0.5) * 0.9, 1.75 + r() * 0.75, z + (r() - 0.5) * 0.9]);
    if (p[2] <= 0.3) continue;
    const s = cam.scaleAt([x, 2, z]) * (0.09 + r() * 0.1);
    const tone = r();
    ctx.fillStyle = rgb(fogged(mix(hex('#243024'), hex('#4a5446'), tone), d));
    ctx.beginPath(); ctx.ellipse(p[0], p[1], s, s * 0.75, r() * 3, 0, TAU); ctx.fill();
  }
}
function cable(ctx, cam, z, seed) {
  const r = mulberry32(seed);
  const y0 = 6.8 + r() * 0.8, y1 = 6.6 + r() * 0.8;
  let prev = [-3.5, y0, z];
  for (let k = 1; k <= 16; k++) {
    const u = k / 16, cur = [lerp(-3.5, 3.5, u), lerp(y0, y1, u) - Math.sin(Math.PI * u) * 0.55, z];
    line3(ctx, cam, prev, cur, 'rgba(10,11,14,0.85)', Math.max(0.7, cam.scaleAt(cur) * 0.012));
    prev = cur;
  }
}
// A distant dome and towers closing the long view down Street A (billboard, heavy haze).
export function skyline(ctx, cam) {
  const base = cam.project([0, 0, -210]);
  if (base[2] <= 0) return;
  const s = cam.scaleAt([0, 0, -210]);
  const X = (x) => base[0] + x * s, Y = (y) => base[1] - y * s;
  ctx.save();
  ctx.fillStyle = rgb(mix(hex('#161c28'), FOG, 0.55));
  ctx.beginPath(); ctx.moveTo(X(-20), Y(0)); ctx.lineTo(X(-20), Y(26)); ctx.lineTo(X(-9), Y(26)); ctx.lineTo(X(-9), Y(32));
  ctx.lineTo(X(-7), Y(32)); ctx.bezierCurveTo(X(-7), Y(47), X(7), Y(47), X(7), Y(32)); ctx.lineTo(X(9), Y(32)); ctx.lineTo(X(9), Y(26));
  ctx.lineTo(X(15), Y(26)); ctx.lineTo(X(15), Y(38)); ctx.lineTo(X(17), Y(41)); ctx.lineTo(X(19), Y(38)); ctx.lineTo(X(19), Y(0)); ctx.closePath(); ctx.fill();
  ctx.fillRect(X(-0.6), Y(52), 1.2 * s, 6 * s);
  ctx.beginPath(); ctx.ellipse(X(0), Y(46.5), 1.6 * s, 1.2 * s, 0, 0, TAU); ctx.fill();
  ctx.restore();
  glow(ctx, X(0), Y(40), s * 16, hex('#6a7890'), 0.06);
}

// Steam rising from a manhole: soft, drifting puffs.
function steam(ctx, cam, x, z, t, seed) {
  const r = mulberry32(seed);
  for (let k = 0; k < 14; k++) {
    const ph = (t * 0.35 + k / 14 + r() * 0.05) % 1;
    const p = cam.project([x + noise1(t * 0.6 + k, seed) * 0.35 + ph * 0.3, 0.1 + ph * 2.6, z + noise1(t * 0.5 + k * 3, seed + 1) * 0.3]);
    if (p[2] <= 0.3) continue;
    const s = cam.scaleAt([x, 1, z]) * (0.25 + ph * 0.9);
    const a = 0.09 * Math.sin(Math.PI * ph);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], s);
    g.addColorStop(0, `rgba(190,196,206,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(190,196,206,0)');
    ctx.fillStyle = g; ctx.fillRect(p[0] - s, p[1] - s, s * 2, s * 2);
  }
  const m = cam.project([x, 0.005, z]), s = cam.scaleAt([x, 0, z]);
  if (m[2] > 0.3) { ctx.fillStyle = 'rgba(8,8,10,0.85)'; ctx.beginPath(); ctx.ellipse(m[0], m[1], s * 0.35, s * 0.35 * Math.abs(cam.sp) + s * 0.05, 0, 0, TAU); ctx.fill(); }
}

// Items to be depth-sorted with the facades and characters.
export function propItems(cam, t) {
  const items = [];
  const within = (p) => { const d = cam.depth(p); return d > 1.4 && d < 70; };
  for (const [x, z] of BOLLARDS) if (within([x, 0.4, z])) items.push({ pos: [x, 0, z], draw: (c) => bollard(c, cam, x, z) });
  PLANTERS.forEach(([x, z], i) => { if (within([x, 1, z])) items.push({ pos: [x, 0, z], draw: (c) => planter(c, cam, x, z, 40 + i) }); });
  STEAM.forEach(([x, z], i) => { if (within([x, 1, z])) items.push({ pos: [x, 0, z], bias: -0.5, draw: (c) => steam(c, cam, x, z, t, 70 + i) }); });
  return items;
}
export function overhead(ctx, cam) { CABLES.forEach((z, i) => { if (cam.depth([0, 7, z]) > 0.5) cable(ctx, cam, z, 90 + i); }); }

// Moths circling a lantern (screen-space, around the projected lamp).
export function moths(ctx, cam, q, t, seed) {
  const p = cam.project(q); if (p[2] <= 0.5 || p[2] > 30) return;
  const s = cam.scaleAt(q);
  for (let k = 0; k < 4; k++) {
    const a = t * (2.1 + k * 0.7) + k * 1.7 + noise1(t * 3 + k, seed) * 2;
    const rr = s * (0.25 + 0.12 * noise1(t * 2 + k * 5, seed + 3));
    const x = p[0] + Math.cos(a) * rr, y = p[1] - s * 0.15 + Math.sin(a * 1.3) * rr * 0.6;
    ctx.fillStyle = 'rgba(255,230,190,0.85)'; ctx.beginPath(); ctx.arc(x, y, Math.max(1, s * 0.012), 0, TAU); ctx.fill();
  }
}

// Fine drizzle: faint everywhere, bright only where it crosses lantern light (as it does on film).
export function rain(ctx, cam, t, lights, strength = 1) {
  if (strength <= 0) return;
  const r = mulberry32(1234);
  const wind = 0.12, fall = 2600; // px/s at unit depth scale
  ctx.save(); ctx.lineCap = 'round';
  // global faint layer (three depth layers)
  for (const [n, len, a, sp] of [[160, 26, 0.07, 1.0], [90, 44, 0.09, 1.35], [40, 70, 0.1, 1.8]]) {
    ctx.strokeStyle = `rgba(200,210,225,${(a * strength).toFixed(3)})`; ctx.lineWidth = sp;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const x0 = r() * (W + 200) - 100, y0 = r() * H, v = fall * sp * (0.8 + r() * 0.4);
      const y = (y0 + t * v) % (H + 200) - 100, x = x0 - (y) * wind;
      ctx.moveTo(x, y); ctx.lineTo(x + len * wind, y - len);
    }
    ctx.stroke();
  }
  // bright streaks inside each lamp's light
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const p = cam.project(L.q); if (p[2] <= 0.5 || p[2] > 45) continue;
    const s = cam.scaleAt(L.q), R = s * 2.4;
    const rl = mulberry32(Math.round(L.q[2] * 10) + 7);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
    g.addColorStop(0, `rgba(255,214,160,${(0.55 * strength).toFixed(3)})`); g.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    const n = Math.min(70, Math.round(20 + s * 0.2));
    for (let k = 0; k < n; k++) {
      const x0 = p[0] + (rl() - 0.5) * R * 2, span = R * 2.4, v = fall * (0.9 + rl() * 0.3) * Math.max(0.4, s / 300);
      const y = p[1] - R * 1.2 + ((rl() * span + t * v) % span), len = Math.max(8, s * 0.12);
      ctx.moveTo(x0 - (y - p[1]) * wind, y); ctx.lineTo(x0 - (y - p[1]) * wind + len * wind, y - len);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Rain ripples on wet ground near the camera.
export function ripples(ctx, cam, t, area) {
  const r = mulberry32(99);
  ctx.save(); ctx.lineWidth = 1.2;
  for (let k = 0; k < 60; k++) {
    const x = lerp(area.x0, area.x1, r()), z = lerp(area.z0, area.z1, r()), off = r();
    const ph = (t * 1.6 + off) % 1;
    const p = cam.project([x, 0.01, z]); if (p[2] <= 0.4 || p[2] > 14) continue;
    const s = cam.scaleAt([x, 0, z]) * (0.03 + ph * 0.16);
    const flat = clamp(Math.abs(cam.toCam([x, 0, z])[1]) / Math.max(0.1, p[2]), 0.12, 1);
    ctx.strokeStyle = `rgba(210,200,185,${(0.22 * (1 - ph)).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(p[0], p[1], s, s * flat, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
