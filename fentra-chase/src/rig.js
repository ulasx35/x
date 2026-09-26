// Bodies: anatomical limb outlines, real hands, keyframed gait, and every view the film needs.
// Figure space: metres, y up, origin on the ground under the pelvis (at gait time 0). T = {ox, oy, s, dir}.
import { clamp, lerp, sstep, easeIO, TAU, smoothShape, poly2, ik, mix, hex, rgb, noise1 } from './engine.js';
import { MAN, CUSTOMERS, tr, P, headProfile, hatProfile, hairProfile, faceFront, hatFront, flashlight, propFront, propSide } from './faces.js';

// ------------------------------------------------------------------ shading helpers
const shadeHex = (c, k) => { const v = hex(c); return rgb([v[0] * k, v[1] * k, v[2] * k]); };

// ------------------------------------------------------------------ limb outlines
// A limb is a joint chain with a width profile [s, anterior, posterior] (half-widths, metres).
// Anterior = the left-hand normal of the chain direction (i.e. the front for a leg or arm pointing down).
function interp(prof, s, k) {
  for (let i = 0; i < prof.length - 1; i++) {
    if (s <= prof[i + 1][0]) { const u = (s - prof[i][0]) / (prof[i + 1][0] - prof[i][0]); const e = u * u * (3 - 2 * u); return lerp(prof[i][k], prof[i + 1][k], e); }
  }
  return prof[prof.length - 1][k];
}
export function limb(g, T, joints, prof, fill, N = 30, capEnd = true) {
  const seg = []; let L = 0;
  for (let i = 0; i < joints.length - 1; i++) { const l = Math.hypot(joints[i + 1][0] - joints[i][0], joints[i + 1][1] - joints[i][1]) || 1e-5; seg.push(l); L += l; }
  const at = (d) => {
    d = clamp(d, 0, L); let acc = 0;
    for (let i = 0; i < seg.length; i++) {
      if (d <= acc + seg[i] || i === seg.length - 1) { const u = (d - acc) / seg[i]; return [lerp(joints[i][0], joints[i + 1][0], u), lerp(joints[i][1], joints[i + 1][1], u)]; }
      acc += seg[i];
    }
  };
  const e = L * 0.07, left = [], right = [];
  let tEnd = [0, -1], tStart = [0, -1];
  for (let k = 0; k <= N; k++) {
    const s = k / N, d = s * L, p = at(d), a = at(d - e), b = at(d + e);
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    if (k === 0) tStart = [tx, ty]; if (k === N) tEnd = [tx, ty];
    const nx = -ty, ny = tx, wa = interp(prof, s, 1), wb = interp(prof, s, 2);
    left.push(tr(T, p[0] + nx * wa, p[1] + ny * wa)); right.push(tr(T, p[0] - nx * wb, p[1] - ny * wb));
  }
  g.beginPath(); g.moveTo(left[0][0], left[0][1]);
  for (let k = 1; k <= N; k++) g.lineTo(left[k][0], left[k][1]);
  const pe = joints[joints.length - 1], we = (interp(prof, 1, 1) + interp(prof, 1, 2)) * 0.9;
  if (capEnd) { const c = tr(T, pe[0] + tEnd[0] * we, pe[1] + tEnd[1] * we); g.quadraticCurveTo(c[0], c[1], right[N][0], right[N][1]); } else g.lineTo(right[N][0], right[N][1]);
  for (let k = N - 1; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
  const p0 = joints[0], w0 = (interp(prof, 0, 1) + interp(prof, 0, 2)) * 0.9;
  const c0 = tr(T, p0[0] - tStart[0] * w0, p0[1] - tStart[1] * w0); g.quadraticCurveTo(c0[0], c0[1], left[0][0], left[0][1]);
  g.closePath(); g.fillStyle = fill; g.fill();
}
// width profiles (knee ≈ s 0.5, elbow ≈ s 0.54)
const LEG = [[0, 0.085, 0.092], [0.18, 0.076, 0.078], [0.42, 0.06, 0.056], [0.5, 0.058, 0.052], [0.6, 0.048, 0.058], [0.72, 0.045, 0.05], [0.9, 0.041, 0.042], [1, 0.04, 0.04]];
const SLEEVE = [[0, 0.064, 0.064], [0.25, 0.058, 0.058], [0.54, 0.047, 0.05], [0.8, 0.046, 0.046], [1, 0.047, 0.047]];
const ARM_BARE = [[0, 0.05, 0.05], [0.54, 0.036, 0.038], [1, 0.03, 0.03]];
const scaleProf = (prof, k) => prof.map(([s, a, b]) => [s, a * k, b * k]);

// ------------------------------------------------------------------ hands
// Local frame at the wrist: u along the hand (direction ang, figure radians), v = left normal.
function handFrame(T, wrist, ang) {
  const cu = Math.cos(ang), su = Math.sin(ang), cv = -su, sv = cu;
  return (u, v) => tr(T, wrist[0] + cu * u + cv * v, wrist[1] + su * u + sv * v);
}
// Loosely closed running hand, side view. thumbUp: +1 thumb on the v+ side.
export function handFistSide(g, T, wrist, ang, skin, shade, side = 1) {
  const H = handFrame(T, wrist, ang), k = side;
  smoothShape(g, [H(-0.005, 0.028 * k), H(0.05, 0.036 * k), H(0.085, 0.03 * k), H(0.098, 0.0), H(0.09, -0.028 * k), H(0.05, -0.034 * k), H(0.0, -0.026 * k)], skin);
  smoothShape(g, [H(0.06, -0.03 * k), H(0.093, -0.022 * k), H(0.098, 0.004 * k), H(0.075, 0.0), H(0.058, -0.016 * k)], shade);
  smoothShape(g, [H(0.02, 0.03 * k), H(0.058, 0.044 * k), H(0.078, 0.036 * k), H(0.06, 0.024 * k), H(0.03, 0.022 * k)], shade);
}
// Relaxed open hand (hanging or walking), side view.
export function handRelaxedSide(g, T, wrist, ang, skin, shade, side = 1) {
  const H = handFrame(T, wrist, ang), k = side;
  smoothShape(g, [H(-0.004, 0.026 * k), H(0.06, 0.032 * k), H(0.12, 0.024 * k), H(0.165, 0.004 * k), H(0.17, -0.012 * k), H(0.13, -0.022 * k), H(0.06, -0.03 * k), H(0.0, -0.025 * k)], skin);
  smoothShape(g, [H(0.02, 0.026 * k), H(0.07, 0.042 * k), H(0.095, 0.036 * k), H(0.075, 0.024 * k), H(0.04, 0.02 * k)], shade);
  g.strokeStyle = shade; g.lineWidth = Math.max(0.6, T.s * 0.0025); g.lineCap = 'round';
  for (const v of [-0.004, 0.009]) { const a = H(0.1, v * k), b = H(0.158, (v - 0.004) * k); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
}
// Relaxed hand hanging at the side, front view (thumb toward the body's centre line).
export function handFront(g, T, wrist, ang, skin, shade, sd) {
  const H = handFrame(T, wrist, ang), k = -sd; // thumb side
  smoothShape(g, [H(-0.004, 0.026), H(0.07, 0.03), H(0.135, 0.022), H(0.17, 0.006), H(0.168, -0.012), H(0.13, -0.024), H(0.06, -0.028), H(0.0, -0.024)], skin);
  smoothShape(g, [H(0.015, 0.024 * k), H(0.06, 0.04 * k), H(0.09, 0.036 * k), H(0.07, 0.024 * k)], shade);
  g.strokeStyle = shade; g.lineWidth = Math.max(0.6, T.s * 0.0025); g.lineCap = 'round';
  for (const v of [-0.012, 0.0, 0.012]) { const a = H(0.118, v), b = H(0.162, v * 0.8); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
}
// Hand gripping cloth / an object, front view (back of the hand toward the viewer).
export function handGrip(g, T, c, ang, skin, shade) {
  const H = handFrame(T, c, ang);
  smoothShape(g, [H(-0.045, 0.034), H(0.03, 0.04), H(0.058, 0.02), H(0.06, -0.022), H(0.03, -0.042), H(-0.045, -0.036)], skin);
  g.strokeStyle = shade; g.lineWidth = Math.max(0.6, T.s * 0.003); g.lineCap = 'round';
  for (const v of [-0.022, -0.006, 0.01, 0.025]) { const a = H(0.028, v), b = H(0.056, v * 0.9); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  smoothShape(g, [H(-0.02, 0.036), H(0.01, 0.05), H(0.035, 0.046), H(0.012, 0.03)], shade);
}

// ------------------------------------------------------------------ shoes
export function shoeSide(g, T, ankle, ang, col, hi, sole = '#141110') {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (x, y) => tr(T, ankle[0] + x * ca + y * sa, ankle[1] - x * sa + y * ca);
  smoothShape(g, [R(-0.075, -0.068), R(0.17, -0.072), R(0.2, -0.066), R(0.198, -0.084), R(-0.075, -0.084)], sole);
  smoothShape(g, [R(-0.06, 0.035), R(-0.08, -0.02), R(-0.072, -0.07), R(0.14, -0.07), R(0.195, -0.06), R(0.19, -0.035), R(0.1, -0.01), R(0.035, 0.03)], col);
  const a = R(0.08, -0.018), b = R(0.17, -0.045);
  g.strokeStyle = hi; g.lineWidth = Math.max(1, T.s * 0.007); g.lineCap = 'round';
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(...R(0.14, -0.022), b[0], b[1]); g.stroke();
}
function shoeFront(g, T, x, y, col, hi, turn = 0) {
  smoothShape(g, P(T, [[x - 0.052 + turn, y - 0.078], [x - 0.058 + turn, y - 0.04], [x - 0.035, y + 0.01], [x + 0.035, y + 0.01], [x + 0.058 + turn, y - 0.04], [x + 0.052 + turn, y - 0.078]]), col);
  smoothShape(g, P(T, [[x - 0.03 + turn, y - 0.05], [x + turn * 1.2, y - 0.03], [x + 0.03 + turn, y - 0.05], [x + turn, y - 0.068]]), hi);
}

// ------------------------------------------------------------------ gait (keyframed swing, planted stance)
function hermite(keys, s, idx) {
  let i = 0; while (i < keys.length - 2 && s > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (s - k1[0]) / (k2[0] - k1[0]);
  const m1 = (k2[idx] - k0[idx]) / ((k2[0] - k0[0]) || 1) * (k2[0] - k1[0]);
  const m2 = (k3[idx] - k1[idx]) / ((k3[0] - k1[0]) || 1) * (k2[0] - k1[0]);
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k1[idx] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[idx] + (u3 - u2) * m2;
}
export const RUN = {
  v: 4.6, T: 0.7, stance: 0.32, reach: 0.24, hipH: 0.9, bob: 0.028, lean: 0.15, arm: 0.58, flex: 1.3, flexAdd: 0.2,
  swing: [[0.22, -0.44, 0.3, 1.2], [0.45, -0.14, 0.4, 0.7], [0.7, 0.22, 0.3, 0.05], [0.88, 0.3, 0.15, -0.15]],
};
export const WALK = {
  v: 1.35, T: 1.1, stance: 0.6, reach: 0.2, hipH: 0.93, bob: 0.018, lean: 0.03, arm: 0.3, flex: 0.28, flexAdd: 0.12,
  swing: [[0.3, -0.34, 0.16, 0.6], [0.55, -0.02, 0.13, 0.12], [0.8, 0.2, 0.11, -0.12]],
};
export function gait(t, o) {
  const { v, T, stance, reach, hipH, bob, lean } = o;
  const phase = o.phase || 0;
  const u0 = t / T + phase;
  const px = v * t;
  const legs = [0, 0.5].map((off) => {
    const u = t / T + off + phase, k = Math.floor(u), p = u - k;
    const tTouch = (k - off - phase) * T;
    const X0 = v * tTouch + reach + 0.16; // ball of the foot
    let ankle, ang;
    if (p < stance) {
      ang = sstep(stance * 0.35, stance, p) * 0.95;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      ankle = [X0 - 0.16 * ca + 0.08 * sa, 0.16 * sa + 0.08 * ca];
    } else {
      const s = (p - stance) / (1 - stance);
      const ca = Math.cos(0.95), sa = Math.sin(0.95);
      const lift = [X0 - 0.16 * ca + 0.08 * sa - v * (tTouch + stance * T), 0.16 * sa + 0.08 * ca];
      const keys = [[0, lift[0], lift[1], 0.95], ...o.swing, [1, reach, 0.08, 0]];
      ankle = [px + hermite(keys, s, 1), hermite(keys, s, 2)];
      ang = hermite(keys, s, 3);
    }
    // pelvis rotation: the hip of the leg that is reaching forward sits a little forward
    const hipOff = 0.032 * Math.cos(TAU * (p - 0.05));
    return { p, ankle, ang, hipOff, stanceNow: p < stance };
  });
  const hy = hipH - bob * Math.cos(TAU * 2 * (u0 - stance / 2));
  const hip = [px, hy];
  for (const L of legs) {
    L.hip = [px + L.hipOff, hy];
    const r = ik(L.hip, L.ankle, 0.44, 0.43, 1);
    L.knee = r.mid; L.ankle = r.end;
  }
  const up = [Math.sin(lean), Math.cos(lean)];
  const chest = [hip[0] + up[0] * 0.56, hip[1] + up[1] * 0.56];
  const arms = legs.map((L, i) => {
    const th = -o.arm * Math.cos(TAU * L.p) + 0.08; // arm opposite its own-side leg
    const shoulder = [chest[0] - L.hipOff * 0.8, chest[1]];
    const el = [shoulder[0] + Math.sin(th) * 0.3, shoulder[1] - Math.cos(th) * 0.3];
    const fa = th + o.flex + o.flexAdd * Math.max(0, th) / Math.max(0.01, o.arm);
    const wrist = [el[0] + Math.sin(fa) * 0.26, el[1] - Math.cos(fa) * 0.26];
    return { sh: shoulder, el, wrist, th, handAng: Math.atan2(-Math.cos(fa), Math.sin(fa)) };
  });
  const neck = [chest[0] + up[0] * 0.08, chest[1] + up[1] * 0.08];
  const head = [neck[0] + 0.03, neck[1] + 0.135];
  return { hip, legs, arms, chest, sh: chest, neck, head, lean, u0, px, t, o };
}

// Coat hem as a damped spring-mass driven by the pelvis's vertical acceleration (footfall impacts)
// plus turbulent air drag. Simulated from rest over the preceding 1.2 s, so any frame is reproducible.
const hemCache = new Map();
export function coatHem(t, o) {
  const key = `${o.v}|${o.T}|${o.phase || 0}|${t.toFixed(4)}`;
  if (hemCache.has(key)) return hemCache.get(key);
  const phase = o.phase || 0;
  const hipY = (tt) => o.hipH - o.bob * Math.cos(TAU * 2 * (tt / o.T + phase - o.stance / 2));
  const dt = 1 / 240;
  let y = 0, vy = 0, x = 0, vx = 0;
  for (let tt = t - 1.2; tt < t; tt += dt) {
    const acc = (hipY(tt + dt) - 2 * hipY(tt) + hipY(tt - dt)) / (dt * dt);
    vy += (-acc - 95 * y - 6.5 * vy) * dt; y += vy * dt;
    const gust = noise1(tt * 5.3, 3) * 4.2 + noise1(tt * 11.7, 4) * 2.0;
    vx += (gust * (o.v / 4.6) - 70 * x - 7 * vx) * dt; x += vx * dt;
  }
  const out = { dy: y, dx: x };
  if (hemCache.size > 4000) hemCache.clear();
  hemCache.set(key, out);
  return out;
}
export function footfalls(o, t0, t1) {
  const out = [];
  for (const off of [0, 0.5]) for (let k = -4; k < 400; k++) { const tt = (k - off - (o.phase || 0)) * o.T; if (tt >= t0 && tt < t1) out.push(tt); }
  return out.sort((a, b) => a - b);
}

// ------------------------------------------------------------------ side view bodies
function legSide(g, T, L, trouser, shoe, shoeHi, k = 1) {
  const col = k < 1 ? shadeHex(trouser, k) : trouser;
  limb(g, T, [L.hip, L.knee, L.ankle], LEG, col);
  // knee crease
  const kp = tr(T, ...L.knee);
  g.save(); g.globalAlpha = 0.25; g.strokeStyle = '#000'; g.lineWidth = Math.max(0.6, T.s * 0.004);
  g.beginPath(); g.arc(kp[0] - T.dir * T.s * 0.02, kp[1], T.s * 0.03, -0.6, 0.6); g.stroke(); g.restore();
  shoeSide(g, T, L.ankle, L.ang, k < 1 ? shadeHex(shoe, k) : shoe, shoeHi);
}
function armSide(g, T, A, sleeve, skin, skinShade, fist, k = 1, profile = SLEEVE, cuff = null) {
  const col = k < 1 ? shadeHex(sleeve, k) : sleeve;
  const hAng = Math.atan2(A.wrist[1] - A.el[1], A.wrist[0] - A.el[0]);
  const wristIn = [A.wrist[0] - Math.cos(hAng) * 0.012, A.wrist[1] - Math.sin(hAng) * 0.012];
  (fist ? handFistSide : handRelaxedSide)(g, T, wristIn, hAng, k < 1 ? shadeHex(skin, k) : skin, skinShade, 1);
  limb(g, T, [A.sh, A.el, A.wrist], profile, col);
  if (cuff) { const c0 = [lerp(A.el[0], A.wrist[0], 0.86), lerp(A.el[1], A.wrist[1], 0.86)]; limb(g, T, [c0, A.wrist], [[0, 0.049, 0.049], [1, 0.048, 0.048]], k < 1 ? shadeHex(cuff, k) : cuff, 6, false); }
}

// Businessman, side view (facing +x) — running or walking.
export function manSide(g, T, pose, opts = {}) {
  const pal = MAN;
  const { hip, legs, arms, lean } = pose;
  const running = (opts.fist ?? true);
  const near = legs[0].ankle[0] > legs[1].ankle[0] ? 0 : 1; // not used for depth; near side is fixed below
  const N = 1, F = 0; // leg/arm index on the camera side
  const up = [Math.sin(lean), Math.cos(lean)], fw = [Math.cos(lean), -Math.sin(lean)];
  const TF = (f, u) => [hip[0] + fw[0] * f + up[0] * u, hip[1] + fw[1] * f + up[1] * u];
  armSide(g, T, arms[F], pal.coat, pal.skin, pal.skinShade, running, 0.72, SLEEVE, pal.coatDeep);
  legSide(g, T, legs[F], pal.trousers, pal.shoe, pal.shoeHi, 0.72);
  legSide(g, T, legs[N], pal.trousers, pal.shoe, pal.shoeHi, 1);
  // coat skirt — open below the belt; front edge rides the forward knee; the back panel trails and lifts
  const kf = legs[0].knee[0] > legs[1].knee[0] ? legs[0].knee : legs[1].knee;
  const kb = legs[0].knee[0] > legs[1].knee[0] ? legs[1].knee : legs[0].knee;
  const fl = opts.flare ?? 1;
  const sim = pose.t !== undefined ? coatHem(pose.t, pose.o) : { dx: 0, dy: 0 };
  const speedK = pose.o ? pose.o.v / 4.6 : 1;
  const hemY = 0.44 + fl * (0.06 * speedK + sim.dy * 1.6);
  const backX = hip[0] - 0.16 - fl * (0.12 * speedK - sim.dx * 1.4 - sim.dy * 0.6);
  const skirt = [TF(-0.125, 0.1), TF(-0.15, -0.04), [backX + 0.03, lerp(hip[1] - 0.04, hemY, 0.5)], [backX, hemY + 0.03 * fl], [lerp(backX, kb[0], 0.55), hemY - 0.02], [kb[0] + 0.04, hemY - 0.03], [kf[0] + 0.02, Math.min(kf[1] - 0.12, hemY + 0.08)], [kf[0] + 0.085, kf[1] + 0.02], [TF(0.12, 0.02)[0] + 0.02, TF(0.12, 0.02)[1]], TF(0.115, 0.1)];
  smoothShape(g, P(T, skirt), pal.coat);
  // folds
  g.save(); g.strokeStyle = pal.coatShade; g.lineCap = 'round'; g.lineWidth = Math.max(1, T.s * 0.012);
  for (const [a, b] of [[TF(-0.05, 0.06), [backX + 0.08, hemY + 0.05]], [TF(0.03, 0.05), [lerp(backX, kf[0], 0.55), hemY + 0.02]]]) { const pa = tr(T, ...a), pb = tr(T, ...b); g.beginPath(); g.moveTo(pa[0], pa[1]); g.quadraticCurveTo((pa[0] + pb[0]) / 2 + T.s * 0.02, (pa[1] + pb[1]) / 2, pb[0], pb[1]); g.stroke(); }
  g.restore();
  // torso (coat): shoulder blade, chest, belt, raised collar
  const torso = [TF(-0.125, 0.1), TF(-0.13, 0.28), TF(-0.145, 0.44), TF(-0.115, 0.56), TF(-0.05, 0.63), TF(0.06, 0.62), TF(0.125, 0.52), TF(0.14, 0.4), TF(0.125, 0.22), TF(0.115, 0.1)];
  smoothShape(g, P(T, torso), pal.coat);
  smoothShape(g, P(T, [TF(-0.125, 0.1), TF(-0.13, 0.28), TF(-0.145, 0.44), TF(-0.115, 0.56), TF(-0.07, 0.5), TF(-0.075, 0.25), TF(-0.07, 0.1)]), pal.coatShade);
  poly2(g, P(T, [TF(-0.128, 0.085), TF(0.118, 0.085), TF(0.12, 0.13), TF(-0.13, 0.13)]), pal.belt);
  const bk = tr(T, ...TF(0.1, 0.108)); g.fillStyle = '#6b5a45'; g.fillRect(bk[0] - T.s * 0.012, bk[1] - T.s * 0.014, T.s * 0.024, T.s * 0.028);
  // neck + head (head stays level: counter the lean)
  smoothShape(g, P(T, [TF(-0.03, 0.6), TF(0.05, 0.6), [pose.head[0] + 0.035, pose.head[1] - 0.09], [pose.head[0] - 0.04, pose.head[1] - 0.07]]), pal.skinShade);
  smoothShape(g, P(T, [TF(-0.085, 0.57), TF(-0.075, 0.69), TF(-0.01, 0.72), TF(0.07, 0.64), TF(0.04, 0.58)]), pal.coatShade);
  headProfile(g, T, pose.head, pal, opts.expr || { eye: 1 });
  armSide(g, T, arms[N], pal.coat, pal.skin, pal.skinShade, running, 1, SLEEVE, pal.coatShade);
}

// Customers, side view (running in silhouette, or walking calmly in the epilogue)
export function personSide(g, T, pose, c, opts = {}) {
  const { hip, legs, arms, lean } = pose;
  const k = c.h / 1.8, w = c.w;
  const up = [Math.sin(lean), Math.cos(lean)], fw = [Math.cos(lean), -Math.sin(lean)];
  const TF = (f, u) => [hip[0] + fw[0] * f * w + up[0] * u * k, hip[1] + fw[1] * f * w + up[1] * u * k];
  const run = opts.fist ?? (pose.legs[0].stanceNow !== undefined && RUN.v > 0 && (opts.walk !== true));
  const sleeveP = scaleProf(SLEEVE, 0.9 * w);
  armSide(g, T, arms[0], c.topShade, c.skin, c.skinShade, !opts.walk, 0.8, sleeveP);
  legSide(g, T, legs[0], c.bottom, c.shoe, c.shoe, 0.75);
  legSide(g, T, legs[1], c.bottom, c.shoe, c.shoe, 1);
  if (c.id === 'phone') smoothShape(g, P(T, [TF(-0.125, 0.12), TF(-0.19, -0.3), TF(-0.02, -0.36), TF(0.13, -0.3), TF(0.12, 0.12)]), c.top); // long coat
  const torso = [TF(-0.12, -0.02), TF(-0.13, 0.25), TF(-0.14, 0.44), TF(-0.11, 0.56), TF(-0.05, 0.62), TF(0.06, 0.61), TF(0.12, 0.52), TF(0.135, 0.4), TF(0.12, 0.2), TF(0.11, -0.02)];
  smoothShape(g, P(T, torso), c.top);
  smoothShape(g, P(T, [TF(-0.12, -0.02), TF(-0.13, 0.25), TF(-0.14, 0.44), TF(-0.11, 0.56), TF(-0.07, 0.45), TF(-0.07, 0.0)]), c.topShade);
  smoothShape(g, P(T, [TF(-0.03, 0.58), TF(0.05, 0.58), [pose.head[0] + 0.035, pose.head[1] - 0.09], [pose.head[0] - 0.04, pose.head[1] - 0.07]]), c.skinShade);
  headProfile(g, T, pose.head, { ...c, eye: '#141110', hair: c.hair }, { eye: 1 }, false, 'none');
  hairProfile(g, T, pose.head, c);
  armSide(g, T, arms[1], c.top, c.skin, c.skinShade, !opts.walk, 1, sleeveP);
  if (opts.props !== false) propSide(g, T, arms[1].wrist, c.prop);
}

// ------------------------------------------------------------------ back view (running away / standing), driven by the same gait data
function backLegs(pose, amp, lat = 0.1) {
  // blend running joints toward a relaxed stance as amp → 0
  return pose.legs.map((L, i) => {
    const sd = i === 0 ? -1 : 1;
    const ky = lerp(0.5, L.knee[1], amp), ay = lerp(0.08, L.ankle[1], amp), hy = lerp(0.93, L.hip[1], amp);
    const behind = amp * clamp((pose.px - L.ankle[0]) / 0.5, -1, 1); // + when the foot is behind (toward camera)
    return { sd, hip: [sd * lat, hy], knee: [sd * (lat + 0.012), ky], ankle: [sd * (lat + 0.005), ay], behind, ang: L.ang * amp };
  });
}
const LEG_BACK = [[0, 0.08, 0.08], [0.2, 0.074, 0.07], [0.5, 0.058, 0.055], [0.62, 0.058, 0.056], [0.85, 0.045, 0.045], [1, 0.042, 0.042]];
function drawBackLeg(g, T, L, col, shoe, soleCol) {
  limb(g, T, [L.hip, L.knee, L.ankle], LEG_BACK, col);
  const a = tr(T, ...L.ankle);
  if (L.behind > 0.25 && L.ankle[1] > 0.14) { // sole turned toward us
    g.save(); g.translate(a[0], a[1] + T.s * 0.03); g.fillStyle = soleCol; g.beginPath(); g.ellipse(0, 0, T.s * 0.05, T.s * (0.045 + 0.06 * L.behind), 0, 0, TAU); g.fill();
    g.fillStyle = shoe; g.beginPath(); g.ellipse(0, -T.s * 0.02, T.s * 0.052, T.s * 0.03, 0, 0, TAU); g.fill(); g.restore();
  } else {
    smoothShape(g, P(T, [[L.ankle[0] - 0.05, L.ankle[1] - 0.085], [L.ankle[0] - 0.055, L.ankle[1] - 0.02], [L.ankle[0], L.ankle[1] + 0.01], [L.ankle[0] + 0.055, L.ankle[1] - 0.02], [L.ankle[0] + 0.05, L.ankle[1] - 0.085]]), shoe);
  }
}
// pose: {phase (run cycles), amp, breath, hunch}
export function manBack(g, T, pose = {}) {
  const pal = MAN;
  const running = pose.phase !== undefined && pose.phase !== null;
  const amp = running ? (pose.amp ?? 1) : 0;
  const gp = gait((running ? pose.phase : 0) * RUN.T, RUN);
  const legs = backLegs(gp, amp);
  const hy = lerp(0.93, gp.hip[1], amp);
  const br = pose.breath || 0;
  const lf = pose.leanF || 0; // forward pitch of the upper body (momentum after a hard stop)
  const shY = hy + 0.54 + (pose.hunch || 0) * 0.03 + br * 0.012 - lf * 0.05;
  const sway = amp * 0.018 * Math.sin(TAU * gp.u0);
  const X = (x, y) => tr(T, x + sway, y);
  // legs: the forward (farther) leg first
  const order = legs[0].behind < legs[1].behind ? [0, 1] : [1, 0];
  for (const i of order) drawBackLeg(g, { ...T, ox: T.ox + T.dir * T.s * sway }, legs[i], pal.trousersShade, pal.shoe, '#3a2a20');
  // arms swinging forward go behind the torso
  const armPts = gp.arms.map((A, i) => {
    const sd = i === 0 ? -1 : 1;
    const ey = lerp(shY - 0.3, A.el[1] - gp.chest[1] + shY, amp), wy = lerp(shY - 0.57, A.wrist[1] - gp.chest[1] + shY, amp);
    return { sd, fwd: A.th * amp, sh: [sd * 0.2, shY - 0.04], el: [sd * (0.255 + 0.02 * amp), ey], wr: [sd * lerp(0.25, 0.2, amp), wy] };
  });
  const drawArm = (A, col) => {
    limb(g, { ...T, ox: T.ox + T.dir * T.s * sway }, [A.sh, A.el, A.wr], [[0, 0.064, 0.064], [0.5, 0.052, 0.052], [1, 0.047, 0.047]], col);
    const w = X(...A.wr);
    g.fillStyle = pal.skinShade; g.beginPath(); g.ellipse(w[0], w[1] + T.s * 0.03, T.s * 0.033, T.s * 0.045, 0, 0, TAU); g.fill();
  };
  for (const A of armPts) if (A.fwd > 0.15) drawArm(A, pal.coatDeep);
  // coat: hem swings with the legs
  const hs = running ? coatHem(gp.t, gp.o) : { dy: 0, dx: 0 };
  const hem = 0.44 + amp * (0.06 + hs.dy * 1.4);
  const hl = legs[0].knee[1] - 0.5 + hs.dx * amp, hr = legs[1].knee[1] - 0.5 - hs.dx * amp;
  smoothShape(g, [X(-0.205, hy + 0.13), X(-0.27 - amp * 0.02, hem + 0.03 + hl * 0.5), X(-0.1, hem - 0.01 + hl * 0.3), X(0.1, hem - 0.01 + hr * 0.3), X(0.27 + amp * 0.02, hem + 0.03 + hr * 0.5), X(0.205, hy + 0.13)], pal.coat);
  poly2(g, [X(-0.006, hy + 0.1), X(0.006, hy + 0.1), X(0.01, hem + 0.02), X(-0.01, hem + 0.02)], pal.coatDeep);
  smoothShape(g, [X(-0.205, hy + 0.13), X(-0.27, hem + 0.03 + hl * 0.5), X(-0.16, hem + 0.02), X(-0.11, hy + 0.1)], pal.coatShade);
  // torso
  smoothShape(g, [X(-0.2, hy + 0.12), X(-0.215, shY - 0.3), X(-0.225, shY - 0.1), X(-0.19, shY + 0.01), X(-0.07, shY + 0.05), X(0.07, shY + 0.05), X(0.19, shY + 0.01), X(0.225, shY - 0.1), X(0.215, shY - 0.3), X(0.2, hy + 0.12)], pal.coat);
  smoothShape(g, [X(-0.2, hy + 0.12), X(-0.215, shY - 0.3), X(-0.225, shY - 0.1), X(-0.19, shY + 0.01), X(-0.12, shY - 0.1), X(-0.1, hy + 0.14)], pal.coatShade);
  smoothShape(g, [X(-0.2, shY - 0.02), X(-0.18, shY - 0.17), X(0.18, shY - 0.17), X(0.2, shY - 0.02)], pal.coatShade + '99'); // storm flap
  poly2(g, [X(-0.198, hy + 0.1), X(0.198, hy + 0.1), X(0.2, hy + 0.15), X(-0.2, hy + 0.15)], pal.belt);
  // head from behind
  const hc = [0, shY + 0.2 - lf * 0.03];
  smoothShape(g, [X(-0.048, shY - 0.02), X(0.048, shY - 0.02), X(0.052, hc[1] - 0.06), X(-0.052, hc[1] - 0.06)], pal.skinShade);
  smoothShape(g, [X(-0.076, hc[1] + 0.06), X(-0.079, hc[1] - 0.06), X(-0.04, hc[1] - 0.105), X(0.04, hc[1] - 0.105), X(0.079, hc[1] - 0.06), X(0.076, hc[1] + 0.06)], pal.hair);
  for (const sd of [-1, 1]) { const e = X(sd * 0.08, hc[1] - 0.01); g.fillStyle = pal.skinShade; g.beginPath(); g.ellipse(e[0], e[1], T.s * 0.012, T.s * 0.026, 0, 0, TAU); g.fill(); }
  smoothShape(g, [X(-0.12, shY - 0.02), X(-0.095, shY + 0.1), X(0.0, shY + 0.125), X(0.095, shY + 0.1), X(0.12, shY - 0.02)], pal.coatShade);
  hatFront(g, { ...T, ox: T.ox + T.dir * T.s * sway }, hc, { ...pal, hatShade: pal.hat });
  for (const A of armPts) if (A.fwd <= 0.15) drawArm(A, A.sd < 0 ? pal.coatShade : pal.coat);
  return { head: hc };
}

// ------------------------------------------------------------------ front view: businessman standing / cowering
export function manFront(g, T, pose = {}) {
  const pal = MAN;
  const cr = pose.crouch || 0, cov = pose.cover || 0, br = pose.breath || 0;
  const shift = pose.shift ?? 0; // weight shift (−1..1)
  const hy = 0.93 - cr * 0.1;
  const shY = 1.47 - cr * 0.12 + br * 0.008 + cov * 0.05;
  const shW = 0.215 - cov * 0.03;
  const headC = [(pose.headX || 0) + shift * 0.01, 1.66 - cr * 0.14 + br * 0.006 - cov * 0.02 + (pose.headDrop || 0)];
  // legs (trousers) with knees; slight contrapposto
  for (const sd of [-1, 1]) {
    const lift = sd === Math.sign(shift) ? 0 : Math.abs(shift) * 0.012;
    const hip = [sd * 0.095 + shift * 0.015, hy + 0.02], knee = [sd * (0.105 + cr * 0.06), 0.5 - cr * 0.05 + lift], ank = [sd * 0.11, 0.09 + lift];
    limb(g, T, [hip, knee, ank], [[0, 0.082, 0.078], [0.5, 0.058, 0.056], [0.8, 0.05, 0.048], [1, 0.047, 0.047]], sd < 0 ? pal.trousers : pal.trousersShade);
    shoeFront(g, T, sd * 0.115, 0.09 + lift, pal.shoe, pal.shoeHi, sd * 0.012);
  }
  // coat skirt (belted, closed), A-line with folds
  const hem = 0.44 - cr * 0.06, waist = hy + 0.14;
  smoothShape(g, P(T, [[-0.2, waist], [-0.25, (waist + hem) / 2], [-0.29 - cr * 0.05, hem + 0.02], [-0.1, hem - 0.015], [0.1, hem - 0.015], [0.29 + cr * 0.05, hem + 0.02], [0.25, (waist + hem) / 2], [0.2, waist]]), pal.coat);
  smoothShape(g, P(T, [[0.015, waist], [0.02, hem - 0.01], [0.29 + cr * 0.05, hem + 0.02], [0.25, (waist + hem) / 2], [0.2, waist]]), pal.coatShade);
  g.save(); g.strokeStyle = pal.coatShade; g.lineWidth = Math.max(1, T.s * 0.01); g.lineCap = 'round';
  for (const x of [-0.14, -0.06]) { const a = tr(T, x, waist - 0.03), b = tr(T, x * 1.35, hem + 0.03); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.restore();
  // torso: sloping trapezius → rounded shoulders → chest → belted waist
  const body = [[-0.2, waist], [-0.205, shY - 0.3], [-shW - 0.01, shY - 0.12], [-shW + 0.01, shY - 0.02], [-0.12, shY + 0.03], [-0.06, shY + 0.05], [0.06, shY + 0.05], [0.12, shY + 0.03], [shW - 0.01, shY - 0.02], [shW + 0.01, shY - 0.12], [0.205, shY - 0.3], [0.2, waist]];
  smoothShape(g, P(T, body), pal.coat);
  smoothShape(g, P(T, [[0.015, shY + 0.02], [0.015, waist], [0.2, waist], [0.205, shY - 0.3], [shW + 0.01, shY - 0.12], [shW - 0.01, shY - 0.02], [0.12, shY + 0.03]]), pal.coatShade);
  if (cov < 0.6) {
    const vB = shY - 0.24;
    poly2(g, P(T, [[-0.065, shY + 0.03], [0.065, shY + 0.03], [0.0, vB]]), pal.shirt);
    poly2(g, P(T, [[-0.014, shY + 0.01], [0.014, shY + 0.01], [0.019, vB + 0.06], [0.0, vB + 0.025], [-0.019, vB + 0.06]]), pal.tie);
    poly2(g, P(T, [[-0.1, shY + 0.035], [-0.035, shY - 0.005], [0.0, vB - 0.02], [-0.02, vB - 0.03], [-0.115, shY - 0.17], [-0.12, shY - 0.05]]), pal.coatLight);
    poly2(g, P(T, [[0.1, shY + 0.035], [0.035, shY - 0.005], [0.0, vB - 0.02], [0.02, vB - 0.03], [0.115, shY - 0.17], [0.12, shY - 0.05]]), pal.coatDeep);
  }
  poly2(g, P(T, [[-0.2, waist - 0.02], [0.2, waist - 0.02], [0.2, waist + 0.03], [-0.2, waist + 0.03]]), pal.belt);
  const bk = tr(T, 0.0, waist + 0.005); g.fillStyle = '#6b5a45'; g.fillRect(bk[0] - T.s * 0.022, bk[1] - T.s * 0.02, T.s * 0.044, T.s * 0.04);
  for (const [x, y] of [[-0.065, shY - 0.3], [0.065, shY - 0.3], [-0.065, shY - 0.4], [0.065, shY - 0.4]]) { const b = tr(T, x, y); g.beginPath(); g.arc(b[0], b[1], T.s * 0.011, 0, TAU); g.fillStyle = pal.button; g.fill(); }
  // head
  faceFront(g, T, headC, pal, pose.head || {}, 'man', pose.lightSide ?? -1);
  hatFront(g, T, headC, pal, (pose.head && pose.head.yaw) || 0);
  // collar: resting, or raised around the face
  if (cov > 0.01) {
    const top = lerp(shY + 0.03, headC[1] - 0.02, cov);
    for (const sd of [-1, 1]) smoothShape(g, P(T, [[sd * (shW + 0.02), shY - 0.02], [sd * (0.14 - cov * 0.02), top + 0.02], [sd * (0.03 * (1 - cov)), top - 0.03 * cov], [sd * 0.02, shY - 0.2], [sd * 0.12, shY - 0.3]]), sd < 0 ? pal.coat : pal.coatShade);
  } else {
    for (const sd of [-1, 1]) smoothShape(g, P(T, [[sd * 0.1, shY + 0.035], [sd * 0.125, shY + 0.11], [sd * 0.05, shY + 0.075], [sd * 0.035, shY + 0.005]]), pal.coatShade);
  }
  // arms: relaxed at the sides (elbows slightly bent), or hands gripping the raised lapels
  for (const sd of [-1, 1]) {
    const sh = [sd * (shW - 0.005), shY - 0.06];
    let el, wr;
    if (cov > 0.01) { el = [sd * lerp(0.26, 0.25, cov), lerp(shY - 0.3, shY - 0.22, cov)]; wr = [sd * lerp(0.25, 0.1, cov), lerp(0.88 - cr * 0.08, headC[1] - 0.14, cov)]; }
    else { const out = pose.armsOut || 0; el = [sd * (0.255 + out * 0.04), shY - 0.3]; wr = [sd * (0.255 + out * 0.1), 0.9 - cr * 0.08 + out * 0.08]; }
    const col = sd < 0 ? pal.coat : pal.coatShade;
    const hAng = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
    if (cov > 0.01) handGrip(g, T, [wr[0] + Math.cos(hAng) * 0.04, wr[1] + Math.sin(hAng) * 0.04], hAng, sd < 0 ? pal.skin : pal.skinShade, pal.skinShade);
    else handFront(g, T, [wr[0], wr[1] + 0.012], hAng, sd < 0 ? pal.skin : pal.skinShade, pal.skinShade, sd);
    limb(g, T, [sh, el, wr], [[0, 0.066, 0.066], [0.5, 0.054, 0.056], [1, 0.05, 0.05]], col);
    limb(g, T, [[lerp(el[0], wr[0], 0.85), lerp(el[1], wr[1], 0.85)], wr], [[0, 0.053, 0.053], [1, 0.052, 0.052]], pal.coatDeep, 6, false);
  }
  return { head: headC, shY };
}

// ------------------------------------------------------------------ front view: customers
export function personFront(g, T, c, pose = {}) {
  const k = c.h / 1.8, w = c.w;
  const S = (x, y) => tr(T, x * w, y * k);
  const Tk = { ...T }; // for limb(): scale by k/w handled via points
  const shY = 1.46, hy = 0.92, hc = [0, 1.66];
  const br = pose.breath || 0, shift = pose.shift ?? 0.4;
  const J = (x, y) => [x * w, y * k];
  // legs (optionally walking toward the viewer)
  for (const sd of [-1, 1]) {
    const lift = pose.walk !== undefined ? Math.max(0, Math.sin(TAU * (pose.walk + (sd > 0 ? 0.5 : 0)))) : (sd === Math.sign(shift) ? 0 : Math.abs(shift) * 0.015);
    const ay = 0.09 + lift * 0.12, ky = 0.5 + lift * 0.07;
    limb(g, T, [J(sd * 0.09, hy), J(sd * (0.1 + lift * 0.01), ky), J(sd * 0.1, ay)], scaleProf([[0, 0.08, 0.076], [0.5, 0.056, 0.054], [0.8, 0.048, 0.046], [1, 0.045, 0.045]], w), c.bottom);
    shoeFront(g, T, sd * 0.1 * w, ay * k, c.shoe, c.shoe, sd * 0.01);
  }
  const long = c.id === 'phone';
  const bottomY = long ? 0.55 : 0.8;
  const body = [[-0.19, bottomY], [-0.205, shY - 0.33], [-0.215, shY - 0.12], [-0.195, shY - 0.02], [-0.11, shY + 0.03], [-0.06, shY + 0.045], [0.06, shY + 0.045], [0.11, shY + 0.03], [0.195, shY - 0.02], [0.215, shY - 0.12], [0.205, shY - 0.33], [0.19, bottomY]];
  smoothShape(g, body.map((p) => S(p[0], p[1] + (p[1] > 1.3 ? br * 0.006 : 0))), c.top);
  smoothShape(g, [S(0.02, shY + 0.02), S(0.02, bottomY), S(0.19, bottomY), S(0.205, shY - 0.33), S(0.215, shY - 0.12), S(0.195, shY - 0.02), S(0.11, shY + 0.03)], c.topShade);
  if (c.id === 'plan') poly2(g, [S(-0.07, shY + 0.03), S(0.07, shY + 0.03), S(0, shY - 0.2)], '#8d8f93');
  if (c.id === 'box') { poly2(g, [S(-0.06, shY + 0.03), S(0.06, shY + 0.03), S(0, shY - 0.12)], '#c9c4b8'); for (let i = 0; i < 4; i++) { const b = S(0, shY - 0.18 - i * 0.12); g.beginPath(); g.arc(b[0], b[1], T.s * 0.01, 0, TAU); g.fillStyle = '#35322e'; g.fill(); } }
  if (c.id === 'folder') poly2(g, [S(-0.06, shY + 0.03), S(0.06, shY + 0.03), S(0, shY - 0.15)], '#d1ccc2');
  if (c.id === 'lamp') { g.strokeStyle = c.topShade; g.lineWidth = T.s * 0.006; for (let i = 0; i < 3; i++) { const a = S(-0.17, 0.86 + i * 0.03), b = S(0.17, 0.86 + i * 0.03); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
  faceFront(g, T, [hc[0] * w, hc[1] * k], { ...c, eye: '#16110e' }, pose.expr || {}, c.style === 'cap' ? 'cap' : c.style, pose.lightSide ?? 1);
  // left arm: torch (raised toward the viewer, or hanging down)
  const shL = J(-0.2, shY - 0.06), shR = J(0.2, shY - 0.06);
  let fl = null;
  const sleeve = scaleProf([[0, 0.062, 0.062], [0.5, 0.05, 0.052], [1, 0.045, 0.045]], w);
  if (pose.light) {
    const aim = pose.aim ?? (pose.light === 'up' ? 1 : 0);
    const el = J(-0.27, lerp(1.17, 1.2, aim)), hand = J(lerp(-0.25, -0.18, aim), lerp(0.9, 1.27, aim));
    fl = flashlight(g, T, tr(T, ...hand), aim, pose.lightOn || 0);
    limb(g, T, [shL, el, hand], sleeve, c.topShade);
    handGrip(g, T, [hand[0], hand[1] - 0.005], aim > 0.5 ? Math.PI / 2 : -Math.PI / 2, c.skinShade, shadeHex(c.skinShade, 0.8));
  } else {
    const el = J(-0.255, 1.16), wr = J(-0.25, 0.88);
    handFront(g, T, [wr[0], wr[1] + 0.01], -Math.PI / 2, c.skinShade, shadeHex(c.skinShade, 0.8), -1);
    limb(g, T, [shL, el, wr], sleeve, c.topShade);
  }
  // right arm: presenting the prop in front of the chest
  const pu = pose.propUp ?? 1;
  const handR = J(lerp(0.25, 0.1, pu), lerp(0.9, 1.12, pu)), elR = J(0.27, lerp(1.16, 1.03, pu));
  limb(g, T, [shR, elR, handR], sleeve, c.top);
  propFront(g, T, tr(T, ...handR), c.prop, pose);
  handGrip(g, T, handR, lerp(-Math.PI / 2, Math.PI * 0.9, pu), c.skin, c.skinShade);
  return { flashlight: fl, head: S(hc[0], hc[1]) };
}

// Customer from behind (standing with a torch raised toward the alley, or running away)
export function personBack(g, T, c, aim = 1, run = null) {
  const k = c.h / 1.8, w = c.w;
  const J = (x, y) => [x * w, y * k];
  const S = (x, y) => tr(T, x * w, y * k);
  const amp = run === null ? 0 : 1;
  const gp = gait((run || 0) * RUN.T, RUN);
  const legs = backLegs(gp, amp, 0.095).map((L) => ({ ...L, hip: J(...L.hip), knee: J(...L.knee), ankle: J(...L.ankle) }));
  const order = legs[0].behind < legs[1].behind ? [0, 1] : [1, 0];
  for (const i of order) drawBackLeg(g, T, legs[i], c.bottom, c.shoe, '#2f2a26');
  const hy = lerp(0.92, gp.hip[1], amp);
  const shY = hy + 0.54;
  const bottomY = c.id === 'phone' ? 0.55 : hy - 0.1;
  smoothShape(g, [S(-0.19, bottomY), S(-0.205, shY - 0.33), S(-0.215, shY - 0.12), S(-0.19, shY - 0.02), S(-0.08, shY + 0.04), S(0.08, shY + 0.04), S(0.19, shY - 0.02), S(0.215, shY - 0.12), S(0.205, shY - 0.33), S(0.19, bottomY)], c.topShade);
  const sleeve = scaleProf([[0, 0.062, 0.062], [0.5, 0.05, 0.052], [1, 0.045, 0.045]], w);
  if (run === null) {
    limb(g, T, [J(-0.2, shY - 0.06), J(-0.2, lerp(1.1, 1.3, aim)), J(-0.16, lerp(1.0, 1.36, aim))], sleeve, c.topShade);
    limb(g, T, [J(0.2, shY - 0.06), J(0.25, 1.15), J(0.25, 0.9)], sleeve, c.topShade);
  } else {
    gp.arms.forEach((A, i) => { const sd = i === 0 ? -1 : 1; limb(g, T, [J(sd * 0.2, shY - 0.05), J(sd * 0.26, A.el[1] - gp.chest[1] + shY), J(sd * 0.21, A.wrist[1] - gp.chest[1] + shY)], sleeve, c.topShade); });
  }
  const hc = S(0, shY + 0.2);
  smoothShape(g, [S(-0.045, shY - 0.02), S(0.045, shY - 0.02), S(0.05, shY + 0.14), S(-0.05, shY + 0.14)], c.skinShade);
  g.beginPath(); g.ellipse(hc[0], hc[1], T.s * 0.08 * w, T.s * 0.115 * k, 0, 0, TAU); g.fillStyle = c.hair; g.fill();
  if (c.style === 'cap') { g.beginPath(); g.ellipse(hc[0], hc[1] - T.s * 0.05, T.s * 0.088, T.s * 0.07, 0, Math.PI, TAU); g.fillStyle = '#4b4740'; g.fill(); }
  if (c.style === 'bun') { g.beginPath(); g.arc(hc[0], hc[1] - T.s * 0.1, T.s * 0.045, 0, TAU); g.fillStyle = c.hair; g.fill(); }
  if (c.style === 'ponytail') smoothShape(g, [[hc[0] - T.s * 0.025, hc[1] - T.s * 0.02], [hc[0] + T.s * 0.025, hc[1] - T.s * 0.02], [hc[0] + T.s * 0.02, hc[1] + T.s * 0.16], [hc[0] - T.s * 0.01, hc[1] + T.s * 0.17]], c.hair);
  if (c.style === 'bob') smoothShape(g, [S(-0.1, shY + 0.26), S(-0.1, shY + 0.08), S(0.1, shY + 0.08), S(0.1, shY + 0.26)], c.hair);
  return { hand: S(-0.16, lerp(1.0, 1.36, aim)) };
}

// ------------------------------------------------------------------ office: seated at the desk, full body (3/4 front)
// The camera sits a little above eye level; thighs point toward it (foreshortened), shins drop to the floor.
export function manSeated(g, T, pose = {}) {
  const pal = MAN;
  if (pose.part === 'arms') return seatedArms(g, T, pose);
  const lean = pose.lean || 0;
  const shY = 1.2 + lean * 0.015, hc = [0.02 + (pose.headX || 0), 1.39 + lean * 0.01];
  // lower legs and shoes (under the desk)
  for (const sd of [-1, 1]) {
    const knee = [sd * 0.13, 0.5], ank = [sd * 0.15, 0.09];
    limb(g, T, [knee, ank], [[0, 0.064, 0.064], [0.3, 0.058, 0.06], [1, 0.047, 0.047]], sd < 0 ? pal.suit : pal.suitShade);
    shoeFront(g, T, sd * 0.155, 0.09, pal.shoe, pal.shoeHi, sd * 0.015);
  }
  // lap: foreshortened thighs from the hips toward the knees (toward the viewer)
  for (const sd of [-1, 1]) {
    smoothShape(g, P(T, [[sd * 0.02, 0.62], [sd * 0.2, 0.62], [sd * 0.215, 0.55], [sd * 0.19, 0.47], [sd * 0.13, 0.44], [sd * 0.07, 0.47], [sd * 0.035, 0.55]]), sd < 0 ? pal.suit : pal.suitShade);
    const kp = tr(T, sd * 0.13, 0.49); g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.ellipse(kp[0], kp[1], T.s * 0.06, T.s * 0.035, 0, 0, TAU); g.fill();
  }
  // jacket: torso down to the lap, open at the bottom
  smoothShape(g, P(T, [[-0.2, 0.6], [-0.215, shY - 0.3], [-0.235, shY - 0.1], [-0.2, shY - 0.01], [-0.1, shY + 0.045], [0.1, shY + 0.045], [0.2, shY - 0.01], [0.235, shY - 0.1], [0.215, shY - 0.3], [0.2, 0.6], [0.04, 0.62], [0.0, 0.7], [-0.04, 0.62]]), pal.suit);
  smoothShape(g, P(T, [[0.02, shY], [0.0, 0.7], [0.04, 0.62], [0.2, 0.6], [0.215, shY - 0.3], [0.235, shY - 0.1], [0.2, shY - 0.01], [0.1, shY + 0.045]]), pal.suitShade);
  poly2(g, P(T, [[-0.065, shY + 0.035], [0.065, shY + 0.035], [0.0, shY - 0.25]]), pal.shirt);
  poly2(g, P(T, [[-0.014, shY + 0.015], [0.014, shY + 0.015], [0.021, shY - 0.2], [0, shY - 0.235], [-0.021, shY - 0.2]]), pal.tie);
  poly2(g, P(T, [[-0.095, shY + 0.045], [-0.035, shY], [0.0, shY - 0.27], [-0.02, shY - 0.28], [-0.13, shY - 0.1]]), '#3a3d44');
  poly2(g, P(T, [[0.095, shY + 0.045], [0.035, shY], [0.0, shY - 0.27], [0.02, shY - 0.28], [0.13, shY - 0.1]]), pal.suitShade);
  const bt = tr(T, 0.0, shY - 0.36); g.beginPath(); g.arc(bt[0], bt[1], T.s * 0.01, 0, TAU); g.fillStyle = '#15161a'; g.fill();
  // head + indoor hair
  faceFront(g, T, hc, pal, pose.expr || {}, 'man', pose.lightSide ?? 1);
  const yaw = (pose.expr && pose.expr.yaw) || 0;
  const Hh = (x, y) => tr(T, hc[0] + x * (1 - Math.abs(yaw) * 0.18) + yaw * 0.03, hc[1] + y);
  smoothShape(g, [Hh(-0.08, 0.02), Hh(-0.079, 0.095), Hh(-0.045, 0.138), Hh(0.03, 0.145), Hh(0.074, 0.115), Hh(0.08, 0.03), Hh(0.068, 0.078), Hh(0.03, 0.098), Hh(-0.03, 0.094), Hh(-0.066, 0.068)], pal.hair);
  g.strokeStyle = '#4a3d33'; g.lineWidth = T.s * 0.003; g.lineCap = 'round';
  { const a = Hh(-0.035, 0.1), b = Hh(-0.03, 0.136); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  seatedArms(g, T, { ...pose, upperOnly: true });
  return { head: hc };
}
// Arms of the seated figure: upper arms (with the body) and forearms + hands (drawn over the desk top).
function seatedArms(g, T, pose) {
  const pal = MAN;
  const shY = 1.2 + (pose.lean || 0) * 0.015;
  for (const sd of [-1, 1]) {
    const sh = [sd * 0.215, shY - 0.06], el = [sd * 0.27, 0.88], wr = [sd * 0.13, pose.handsY ?? 0.79];
    if (pose.upperOnly) { limb(g, T, [sh, el], [[0, 0.064, 0.064], [1, 0.056, 0.056]], sd < 0 ? pal.suit : pal.suitShade); continue; }
    limb(g, T, [el, wr], [[0, 0.058, 0.058], [1, 0.05, 0.05]], sd < 0 ? pal.suit : pal.suitShade);
    const cf = [lerp(el[0], wr[0], 0.93), lerp(el[1], wr[1], 0.93)];
    limb(g, T, [cf, wr], [[0, 0.046, 0.046], [1, 0.045, 0.045]], pal.shirt, 6, false);
    handGrip(g, T, [wr[0] - sd * 0.035, wr[1] - 0.01], sd < 0 ? -0.35 : Math.PI + 0.35, pal.skin, pal.skinShade);
  }
}
