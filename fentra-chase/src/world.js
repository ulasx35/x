// The neighbourhood: one consistent set of streets, facades, lanterns and wet stone, rendered from any camera.
// Top view (metres): Street A runs north (-z) at x∈[-3.5,3.5]; a side street enters from the west at z∈[-2.5,1.5];
// Alley B branches east at z∈[-49,-46]; Alley C branches north from Alley B at x∈[18,20.5] and dead-ends at z=-62.
import { W, H, lerp, clamp, mulberry32, hex, rgb, mix, mul, add, fogged, FOG, projectPoly, pathPoly, fillPoly, line3, glow, softDisc, beam } from './engine.js';

const STONE = [hex('#3b3a39'), hex('#353330'), hex('#403c36'), hex('#34373b'), hex('#3a3632')];
const WARM = hex('#ffb866');
const WARM_SOFT = hex('#f0a45a');
const WIN_LIT = hex('#d8924a');
const GLASS = hex('#10151c');
const BRICK = hex('#40302a');

// ------------------------------------------------------------------ walls
// A wall is a vertical rectangle: origin o (bottom-left seen from the street), unit direction u along the ground,
// length L, height h, and normal n pointing into the street.
function wall(o, u, L, h, seed, style = 'stone', opts = {}) {
  const n = [u[2], 0, -u[0]]; // left-hand normal (street side), chosen per definition order
  return { o, u, L, h, n: opts.flip ? [-n[0], 0, -n[2]] : n, seed, style, ...opts };
}
export const WALLS = [
  // Street A — west side (faces +x): two runs around the side-street opening
  wall([-3.5, 0, 12], [0, 0, -1], 10.5, 12.5, 1, 'stone', { flip: true }),
  wall([-3.5, 0, -2.5], [0, 0, -1], 110, 12, 2, 'stone', { flip: true }),
  // side street (west) walls
  wall([-3.5, 0, 1.5], [-1, 0, 0], 22, 11, 3, 'stone', { flip: true }),
  wall([-25.5, 0, -2.5], [1, 0, 0], 22, 13, 4, 'stone', { flip: true }),
  // Street A — east side (faces -x) around the Alley B opening
  wall([3.5, 0, -46], [0, 0, 1], 58, 13, 5, 'stone', { flip: true }),
  wall([3.5, 0, -115], [0, 0, 1], 66, 12.5, 6, 'stone', { flip: true }),
  // Alley B (x from 3.5 to 40): south wall faces -z, north wall faces +z with the Alley C opening
  wall([40, 0, -46], [-1, 0, 0], 36.5, 11, 7, 'stone', { flip: true }),
  wall([3.5, 0, -49], [1, 0, 0], 14.5, 13, 8, 'stone', { flip: true }),
  wall([20.5, 0, -49], [1, 0, 0], 19.5, 12, 9, 'stone', { flip: true }),
  wall([40, 0, -49], [0, 0, 1], 3, 14, 10, 'stone', { flip: true }),
  // Alley C (dead end)
  wall([18, 0, -49], [0, 0, -1], 13, 12, 11, 'stone', { flip: true }),
  wall([20.5, 0, -62], [0, 0, 1], 13, 11, 12, 'stone', { flip: true }),
  wall([18, 0, -62], [1, 0, 0], 2.5, 6.4, 13, 'brick', { flip: true, noWindows: true }),
];
// A taller building behind the dead-end wall (seen above it)
WALLS.push(wall([16, 0, -66], [1, 0, 0], 7, 15, 14, 'stone', { flip: true }));

// Lanterns (wall brackets) — same design everywhere.
export const LAMPS = [
  { p: [-3.5, 3.6, -6], out: [1, 0, 0] },
  { p: [3.5, 3.6, -13], out: [-1, 0, 0] },
  { p: [0, 5.7, -20], out: [0, 0, 0], hang: true, cone: true },
  { p: [3.5, 3.6, -30], out: [-1, 0, 0] },
  { p: [-3.5, 3.6, -40], out: [1, 0, 0] },
  { p: [3.5, 3.6, -53], out: [-1, 0, 0] },
  { p: [-3.5, 3.6, -64], out: [1, 0, 0] },
  { p: [3.5, 3.6, -78], out: [-1, 0, 0] },
  { p: [-3.5, 3.6, -92], out: [1, 0, 0] },
  { p: [-12, 3.4, 1.5], out: [0, 0, -1] },
  { p: [11, 3.3, -46], out: [0, 0, -1] },
  { p: [19.25, 3.3, -46], out: [0, 0, -1] },
  { p: [29, 3.3, -49], out: [0, 0, 1] },
  { p: [20.5, 3.1, -56.5], out: [-1, 0, 0], dim: 0.75 },
];
export function lampPos(L) { return [L.p[0] + L.out[0] * 0.55, L.p[1] - 0.1, L.p[2] + L.out[2] * 0.55]; }

// Ground regions
const GROUND = [
  { x0: -3.5, x1: 3.5, z0: -130, z1: 14, kind: 'slab' },
  { x0: -26, x1: -3.5, z0: -2.5, z1: 1.5, kind: 'cobble' },
  { x0: 3.5, x1: 40, z0: -49, z1: -46, kind: 'cobble' },
  { x0: 18, x1: 20.5, z0: -62, z1: -49, kind: 'cobble' },
];

// ------------------------------------------------------------------ light model
function lampLight(p, amount = 1) {
  let I = 0;
  for (const L of LAMPS) {
    const q = lampPos(L);
    const d2 = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    I += (L.dim || 1) * 6 / (d2 + 4);
  }
  return clamp(I * amount, 0, 1.6);
}
const AMB = hex('#262c37');
function shade(base, p, cam, extraLight = 0) {
  const I = lampLight(p) + extraLight;
  const lit = add(mul(base, 0.55), mul(mix(base, WARM_SOFT, 0.55), I * 0.9));
  const c = add(mul(AMB, 0.35), lit);
  return fogged(c, cam.depth(p), 0.045);
}

// ------------------------------------------------------------------ drawing
const P3 = (w, s, y, d = 0) => [w.o[0] + w.u[0] * s + w.n[0] * d, y, w.o[2] + w.u[2] * s + w.n[2] * d];

function wallChunks(w) {
  const bay = w.style === 'brick' ? w.L : 3.2;
  const n = Math.max(1, Math.round(w.L / bay));
  const out = [];
  for (let i = 0; i < n; i++) out.push({ w, s0: (i * w.L) / n, s1: ((i + 1) * w.L) / n, i });
  return out;
}

function drawChunk(ctx, cam, ch, extra) {
  const { w, s0, s1, i } = ch;
  const r = mulberry32(w.seed * 1000 + i);
  const mid = P3(w, (s0 + s1) / 2, 2);
  // backface cull
  const toCam = [cam.pos[0] - mid[0], cam.pos[2] - mid[2]];
  if (toCam[0] * w.n[0] + toCam[1] * w.n[2] < 0) return;
  const d = cam.depth(mid);
  const base = w.style === 'brick' ? BRICK : STONE[(w.seed + i) % STONE.length];
  const hTop = w.h + (w.style === 'brick' ? 0 : ((w.seed * 7 + i * 3) % 4 < 1 ? 0.8 : 0));
  const quad = [P3(w, s0, 0), P3(w, s1, 0), P3(w, s1, hTop), P3(w, s0, hTop)];
  const sp = fillPoly(ctx, cam, quad, rgb(shade(base, P3(w, (s0 + s1) / 2, 1.8), cam)));
  if (!sp) return;
  // light pools from lanterns on this wall (clipped to the chunk)
  ctx.save(); pathPoly(ctx, sp); ctx.clip();
  // vertical value gradient (darker at the top, like the reference noir plates)
  const top = cam.project(P3(w, (s0 + s1) / 2, hTop)), bot = cam.project(P3(w, (s0 + s1) / 2, 0));
  if (top[2] > 0 && bot[2] > 0) {
    const gr = ctx.createLinearGradient(0, top[1], 0, bot[1]);
    gr.addColorStop(0, 'rgba(8,10,16,0.55)'); gr.addColorStop(0.6, 'rgba(8,10,16,0.0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
  for (const L of LAMPS) wallPool(ctx, cam, w, L, (s0 + s1) / 2, extra);
  if (extra && extra.wallLights) for (const fl of extra.wallLights) fl(ctx, cam, w, s0, s1);
  ctx.restore();
  const near = d < 45;
  // plinth + string courses + cornice
  const band = (y0, y1, k, dd = 0) => fillPoly(ctx, cam, [P3(w, s0, y0, dd), P3(w, s1, y0, dd), P3(w, s1, y1, dd), P3(w, s0, y1, dd)], rgb(shade(mul(base, k), P3(w, (s0 + s1) / 2, (y0 + y1) / 2), cam)));
  if (w.style === 'brick') {
    if (near) for (let y = 0.25; y < hTop; y += 0.25) line3(ctx, cam, P3(w, s0, y, 0.001), P3(w, s1, y, 0.001), 'rgba(10,8,8,0.35)', Math.max(0.6, cam.scaleAt(mid) * 0.012));
    band(hTop - 0.25, hTop, 1.15, 0.05);
    return;
  }
  band(0, 0.55, 0.78, 0.02);
  for (const y of [4.1, 7.4, 10.7]) if (y < hTop - 0.8) band(y, y + 0.14, 1.28, 0.04);
  band(hTop - 0.45, hTop, 1.2, 0.12);
  if (near) for (let y = 0.9; y < 4.0; y += 0.42) line3(ctx, cam, P3(w, s0, y, 0.003), P3(w, s1, y, 0.003), 'rgba(0,0,0,0.16)', Math.max(0.5, cam.scaleAt(mid) * 0.01));
  if (w.noWindows) return;
  // upper-floor windows
  const cx = (s0 + s1) / 2;
  for (const fy of [4.8, 8.1, 11.4]) {
    if (fy + 1.9 > hTop - 0.5) continue;
    const lit = r() < 0.22;
    const wq = [P3(w, cx - 0.6, fy), P3(w, cx + 0.6, fy), P3(w, cx + 0.6, fy + 1.85), P3(w, cx - 0.6, fy + 1.85)];
    band(fy - 0.12, fy, 1.3, 0.05); // sill
    const col = lit ? mix(WIN_LIT, FOG, 1 - Math.exp(-cam.depth(wq[0]) * 0.03)) : fogged(mix(GLASS, hex('#2a3342'), 0.25), cam.depth(wq[0]));
    const s = fillPoly(ctx, cam, wq, rgb(col));
    if (s && near) { // mullion + transom
      line3(ctx, cam, P3(w, cx, fy, 0.01), P3(w, cx, fy + 1.85, 0.01), 'rgba(20,18,16,0.8)', Math.max(0.8, cam.scaleAt(mid) * 0.04));
      line3(ctx, cam, P3(w, cx - 0.6, fy + 1.3, 0.01), P3(w, cx + 0.6, fy + 1.3, 0.01), 'rgba(20,18,16,0.8)', Math.max(0.8, cam.scaleAt(mid) * 0.035));
    }
    if (lit && s) { const c = cam.project(P3(w, cx, fy + 1.1, 0.2)); glow(ctx, c[0], c[1], cam.scaleAt(mid) * 1.2, WIN_LIT, 0.12); }
  }
  // ground floor: door / shopfront / shutter
  const kind = (w.seed * 3 + i) % 3;
  if (kind === 0) {
    fillPoly(ctx, cam, [P3(w, cx - 0.62, 0.55), P3(w, cx + 0.62, 0.55), P3(w, cx + 0.62, 3.1), P3(w, cx - 0.62, 3.1)], rgb(fogged(hex('#211a15'), d)));
    fillPoly(ctx, cam, [P3(w, cx - 0.62, 3.1), P3(w, cx + 0.62, 3.1), P3(w, cx + 0.62, 3.55), P3(w, cx - 0.62, 3.55)], rgb(fogged(r() < 0.5 ? mix(WIN_LIT, GLASS, 0.55) : GLASS, d)));
    if (near) line3(ctx, cam, P3(w, cx, 0.6, 0.01), P3(w, cx, 3.05, 0.01), 'rgba(0,0,0,0.5)', Math.max(0.6, cam.scaleAt(mid) * 0.02));
  } else if (kind === 1) {
    const warm = r() < 0.45;
    fillPoly(ctx, cam, [P3(w, s0 + 0.35, 0.6), P3(w, s1 - 0.35, 0.6), P3(w, s1 - 0.35, 3.3), P3(w, s0 + 0.35, 3.3)], rgb(fogged(warm ? mix(WIN_LIT, GLASS, 0.72) : mix(GLASS, hex('#1c232d'), 0.4), d)));
    if (near) line3(ctx, cam, P3(w, cx, 0.6, 0.01), P3(w, cx, 3.3, 0.01), 'rgba(12,12,14,0.8)', Math.max(0.8, cam.scaleAt(mid) * 0.05));
  } else {
    fillPoly(ctx, cam, [P3(w, s0 + 0.4, 0.55), P3(w, s1 - 0.4, 0.55), P3(w, s1 - 0.4, 3.0), P3(w, s0 + 0.4, 3.0)], rgb(fogged(hex('#2e3236'), d)));
    if (near) for (let y = 0.7; y < 3.0; y += 0.16) line3(ctx, cam, P3(w, s0 + 0.4, y, 0.01), P3(w, s1 - 0.4, y, 0.01), 'rgba(0,0,0,0.25)', Math.max(0.5, cam.scaleAt(mid) * 0.01));
  }
}

// Warm pool of lantern light on a wall: an ellipse in the wall plane, drawn through an affine approximation.
function wallPool(ctx, cam, w, L, sMid, extra) {
  const q = lampPos(L);
  // distance of lamp to wall plane
  const rel = [q[0] - w.o[0], q[2] - w.o[2]];
  const dist = rel[0] * w.n[0] + rel[1] * w.n[2];
  if (dist < -0.2 || dist > 9) return;
  const s = rel[0] * w.u[0] + rel[1] * w.u[2];
  if (Math.abs(s - sMid) > 9) return;
  const R = 2.2 + dist * 0.55;
  const c = P3(w, s, q[1] - 0.9 - dist * 0.1, 0.02);
  const a = cam.project(c), bu = cam.project(P3(w, s + R, q[1] - 0.9 - dist * 0.1, 0.02)), bv = cam.project(P3(w, s, q[1] - 0.9 - dist * 0.1 + R * 1.15, 0.02));
  if (a[2] <= 0.1 || bu[2] <= 0.1 || bv[2] <= 0.1) return;
  const k = (L.dim || 1) * clamp(1.15 - dist * 0.12) * (extra && extra.lampGain !== undefined ? extra.lampGain : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.setTransform(bu[0] - a[0], bu[1] - a[1], bv[0] - a[0], bv[1] - a[1], a[0], a[1]);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  const col = fogged(mul(WARM, 0.55), cam.depth(c), 0.03);
  g.addColorStop(0, rgb(col, 0.55 * k)); g.addColorStop(0.45, rgb(col, 0.22 * k)); g.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function drawGround(ctx, cam, extra) {
  for (const G of GROUND) {
    // strips across depth so fog & light vary smoothly
    const alongZ = (G.z1 - G.z0) >= (G.x1 - G.x0);
    const n = Math.ceil((alongZ ? G.z1 - G.z0 : G.x1 - G.x0) / 1.5);
    for (let i = 0; i < n; i++) {
      let q;
      if (alongZ) { const a = lerp(G.z0, G.z1, i / n), b = lerp(G.z0, G.z1, (i + 1) / n); q = [[G.x0, 0, a], [G.x1, 0, a], [G.x1, 0, b], [G.x0, 0, b]]; }
      else { const a = lerp(G.x0, G.x1, i / n), b = lerp(G.x0, G.x1, (i + 1) / n); q = [[a, 0, G.z0], [b, 0, G.z0], [b, 0, G.z1], [a, 0, G.z1]]; }
      const c = [(q[0][0] + q[2][0]) / 2, 0, (q[0][2] + q[2][2]) / 2];
      const base = G.kind === 'slab' ? hex('#23252a') : hex('#1f2125');
      fillPoly(ctx, cam, q, rgb(shade(base, c, cam)));
    }
    // joints (only near the camera)
    const step = G.kind === 'slab' ? 0.6 : 0.3;
    const lw = (p) => Math.max(0.5, cam.scaleAt(p) * (G.kind === 'slab' ? 0.012 : 0.02));
    for (let x = G.x0; x <= G.x1 + 1e-6; x += step) {
      const a = [x, 0.001, Math.max(G.z0, cam.pos[2] - 26)], b = [x, 0.001, Math.min(G.z1, cam.pos[2] + 26)];
      if (a[2] < b[2]) line3(ctx, cam, a, b, G.kind === 'slab' ? 'rgba(8,9,12,0.16)' : 'rgba(8,9,12,0.3)', lw([x, 0, cam.pos[2] - 3]));
    }
    for (let z = Math.ceil(Math.max(G.z0, cam.pos[2] - 26) / step) * step; z <= Math.min(G.z1, cam.pos[2] + 26); z += step) {
      const x0 = Math.max(G.x0, cam.pos[0] - 26), x1 = Math.min(G.x1, cam.pos[0] + 26);
      if (x0 < x1) line3(ctx, cam, [x0, 0.001, z], [x1, 0.001, z], G.kind === 'slab' ? 'rgba(8,9,12,0.16)' : 'rgba(8,9,12,0.3)', lw([cam.pos[0], 0, z]));
    }
  }
  // lantern pools on the ground + wet reflections
  for (const L of LAMPS) {
    const q = lampPos(L);
    const k = (L.dim || 1) * (extra && extra.lampGain !== undefined ? extra.lampGain : 1);
    groundPool(ctx, cam, [q[0] + L.out[0] * 0.6, 0.002, q[2] + L.out[2] * 0.6], 3.2, fogged(mul(WARM, 0.5), cam.depth(q), 0.03), 0.4 * k);
    reflection(ctx, cam, q, 0.35, WARM, 0.55 * k);
  }
  if (extra && extra.groundLights) for (const f of extra.groundLights) f(ctx, cam);
}
export function groundPool(ctx, cam, c, R, col, a) {
  const p = cam.project(c), px = cam.project([c[0] + R, c[1], c[2]]), pz = cam.project([c[0], c[1], c[2] + R]);
  if (p[2] <= 0.1 || px[2] <= 0.1 || pz[2] <= 0.1) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.setTransform(px[0] - p[0], px[1] - p[1], pz[0] - p[0], pz[1] - p[1], p[0], p[1]);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, rgb(col, a)); g.addColorStop(0.5, rgb(col, a * 0.35)); g.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
// Mirror reflection of a light source in wet stone: a soft vertical streak below the contact point.
export function reflection(ctx, cam, q, r, col, a) {
  const top = cam.project([q[0], 0, q[2]]), bot = cam.project([q[0], -q[1] * 0.9, q[2]]);
  if (top[2] <= 0.1 || bot[2] <= 0.1) return;
  const len = Math.abs(bot[1] - top[1]), wpx = Math.max(2, cam.scaleAt(q) * r);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, top[1], 0, bot[1] + len * 0.4);
  g.addColorStop(0, rgb(col, 0)); g.addColorStop(0.25, rgb(col, a * 0.35)); g.addColorStop(0.7, rgb(col, a * 0.5)); g.addColorStop(1, rgb(col, 0));
  ctx.fillStyle = g; ctx.filter = `blur(${Math.max(1.5, wpx * 0.35).toFixed(1)}px)`;
  ctx.beginPath(); ctx.ellipse(bot[0], (top[1] + bot[1]) / 2 + len * 0.15, wpx * 0.7, len * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLamp(ctx, cam, L, extra) {
  const q = lampPos(L);
  const d = cam.depth(q);
  if (d < 0.2) return;
  const s = cam.scaleAt(q);
  if (L.hang) {
    for (const sx of [-3.5, 3.5]) {
      let prev = [q[0], q[1] + 0.45, q[2]];
      for (let k = 1; k <= 8; k++) {
        const u = k / 8, x = lerp(q[0], sx, u), y = q[1] + 0.45 + 1.1 * u - 0.5 * Math.sin(Math.PI * u) * 0.6;
        const cur = [x, y, q[2]];
        line3(ctx, cam, prev, cur, rgb(fogged(hex('#0f0f11'), d)), Math.max(0.8, s * 0.012));
        prev = cur;
      }
    }
  } else {
    line3(ctx, cam, [L.p[0], L.p[1] + 0.35, L.p[2]], [q[0], q[1] + 0.45, q[2]], rgb(fogged(hex('#141416'), d)), Math.max(1, s * 0.035));
  }
  // lantern body
  const p = cam.project(q);
  if (p[2] <= 0) return;
  ctx.save();
  ctx.fillStyle = rgb(fogged(hex('#18181a'), d));
  ctx.beginPath(); ctx.moveTo(p[0] - s * 0.16, p[1] - s * 0.3); ctx.lineTo(p[0] + s * 0.16, p[1] - s * 0.3); ctx.lineTo(p[0] + s * 0.11, p[1] - s * 0.44); ctx.lineTo(p[0] - s * 0.11, p[1] - s * 0.44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgb(mix(hex('#ffd9a0'), FOG, 1 - Math.exp(-d * 0.02)));
  ctx.fillRect(p[0] - s * 0.1, p[1] - s * 0.3, s * 0.2, s * 0.3);
  ctx.fillStyle = rgb(fogged(hex('#18181a'), d));
  ctx.fillRect(p[0] - s * 0.14, p[1], s * 0.28, s * 0.05);
  ctx.fillRect(p[0] - s * 0.012, p[1] - s * 0.3, s * 0.024, s * 0.3);
  ctx.restore();
  const k = (L.dim || 1) * (extra && extra.lampGain !== undefined ? extra.lampGain : 1);
  glow(ctx, p[0], p[1] - s * 0.15, s * 1.6, WARM, 0.32 * k);
  glow(ctx, p[0], p[1] - s * 0.15, s * 0.45, hex('#ffe2b8'), 0.5 * k);
  if (L.cone) { // visible beam in the haze
    const g0 = cam.project([q[0], q[1] - 0.2, q[2]]), g1 = cam.project([q[0] + L.out[0] * 1.2, 0, q[2]]);
    if (g0[2] > 0 && g1[2] > 0) beam(ctx, g0, g1, s * 0.16, cam.scaleAt([q[0], 0, q[2]]) * 1.9, WARM_SOFT, 0.2 * k);
  }
}

function drawSky(ctx, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const hz = cam.project([cam.pos[0] + Math.sin(cam.yaw) * 500, 0, cam.pos[2] - Math.cos(cam.yaw) * 500]);
  const hy = clamp((hz[1] || H * 0.5) / H, 0.05, 0.95);
  g.addColorStop(0, '#070a11'); g.addColorStop(Math.max(0, hy - 0.35), '#0d1320'); g.addColorStop(hy, '#1d2533'); g.addColorStop(1, '#141922');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// Render the neighbourhood. actors: [{pos:[x,y,z], draw(ctx)}] depth-sorted with the walls.
export function renderWorld(ctx, cam, extra = {}) {
  ctx.save();
  drawSky(ctx, cam);
  drawGround(ctx, cam, extra);
  const items = [];
  for (const w of WALLS) for (const ch of wallChunks(w)) {
    const m = P3(w, (ch.s0 + ch.s1) / 2, 2);
    const d = cam.depth(m);
    if (d < -4) continue;
    items.push({ d: Math.hypot(m[0] - cam.pos[0], m[2] - cam.pos[2]), f: () => drawChunk(ctx, cam, ch, extra) });
  }
  for (const L of LAMPS) {
    const q = lampPos(L);
    if (cam.depth(q) > 0.2) items.push({ d: Math.hypot(q[0] - cam.pos[0], q[2] - cam.pos[2]) - 0.6, f: () => drawLamp(ctx, cam, L, extra) });
  }
  for (const a of extra.actors || []) items.push({ d: Math.hypot(a.pos[0] - cam.pos[0], a.pos[2] - cam.pos[2]) - (a.bias || 0), f: () => a.draw(ctx) });
  items.sort((a, b) => b.d - a.d);
  for (const it of items) it.f();
  if (extra.after) extra.after(ctx);
  // haze veil
  const hz = ctx.createLinearGradient(0, 0, 0, H);
  hz.addColorStop(0, 'rgba(27,34,48,0.10)'); hz.addColorStop(0.5, 'rgba(27,34,48,0.04)'); hz.addColorStop(1, 'rgba(10,12,16,0.18)');
  ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
