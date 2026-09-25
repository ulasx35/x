// Character rigs. All figure-space units are metres, y up, origin on the ground under the pelvis.
// A transform T = {ox, oy, s, dir} maps figure space to screen: X = ox + dir*s*x, Y = oy - s*y.
import { clamp, lerp, sstep, easeIO, TAU, capsule, poly2, smoothShape, ik, noise1 } from './engine.js';

// ------------------------------------------------------------------ palettes (fixed for the whole film)
export const MAN = {
  skin: '#c69a7c', skinShade: '#94694f', lip: '#9c6a58', hair: '#2b221d', eye: '#17120f',
  coat: '#74644f', coatShade: '#5a4c3c', coatDeep: '#43392d', coatLight: '#8a7860', belt: '#3f352a', button: '#2b241d',
  hat: '#1d1d21', hatBand: '#34333a', hatShade: '#121215',
  suit: '#2d3036', suitShade: '#1f2126', shirt: '#d8d2c6', tie: '#2c3342',
  trousers: '#24272d', trousersShade: '#181a1f', shoe: '#2c1d16', shoeHi: '#6b4a38',
};
export const CUSTOMERS = [
  { id: 'lamp', skin: '#d4a98d', skinShade: '#a47a60', hair: '#4a2c22', style: 'bob', top: '#5f5b3a', topShade: '#48452b', bottom: '#2a2a2d', shoe: '#1f1b18', h: 1.66, w: 0.95, prop: 'lamp', lip: '#a4695c' },
  { id: 'plan', skin: '#b8876a', skinShade: '#8b6048', hair: '#3a3836', style: 'short', glasses: true, top: '#2d394d', topShade: '#222b3a', bottom: '#2a2a2e', shoe: '#18181a', h: 1.86, w: 1.05, prop: 'plan', lip: '#8f5e4c' },
  { id: 'phone', skin: '#8d5e45', skinShade: '#684230', hair: '#1f1815', style: 'ponytail', top: '#5b2c32', topShade: '#442126', bottom: '#232326', shoe: '#1b1b1d', h: 1.64, w: 0.93, prop: 'phone', lip: '#6e3f33' },
  { id: 'box', skin: '#c9a086', skinShade: '#9b755e', hair: '#8b8680', style: 'cap', beard: true, top: '#5f5b56', topShade: '#4a4642', bottom: '#4a3b2f', shoe: '#231b15', h: 1.74, w: 1.02, prop: 'box', lip: '#9a6a5a' },
  { id: 'folder', skin: '#a4735a', skinShade: '#7b523e', hair: '#2d221d', style: 'bun', top: '#2e473d', topShade: '#22352e', bottom: '#262626', shoe: '#1a1a1a', h: 1.70, w: 0.97, prop: 'folder', lip: '#84503f' },
];

export const tr = (T, x, y) => [T.ox + T.dir * T.s * x, T.oy - T.s * y];
// A closed hand (fist / grip): palm block, curled finger line, thumb. p = screen centre, ang = screen angle of the forearm.
export function fist(g, p, s, ang, skin, shade, thumbSide = 1) {
  g.save(); g.translate(p[0], p[1]); g.rotate(ang);
  g.fillStyle = skin; g.beginPath(); g.roundRect(-s * 0.036, -s * 0.042, s * 0.072, s * 0.09, s * 0.024); g.fill();
  g.fillStyle = shade; g.beginPath(); g.roundRect(-s * 0.036, s * 0.02, s * 0.072, s * 0.028, s * 0.014); g.fill();
  g.strokeStyle = shade; g.lineWidth = Math.max(0.8, s * 0.004); g.lineCap = 'round';
  for (const x of [-0.012, 0.006, 0.022]) { g.beginPath(); g.moveTo(s * x, s * 0.022); g.lineTo(s * x, s * 0.04); g.stroke(); }
  g.fillStyle = shade; g.beginPath(); g.ellipse(thumbSide * s * 0.03, -s * 0.005, s * 0.013, s * 0.03, thumbSide * 0.35, 0, TAU); g.fill();
  g.restore();
}
const P = (T, pts) => pts.map((p) => tr(T, p[0], p[1]));

// ------------------------------------------------------------------ side-view run / walk (facing +x)
// Feet are solved by IK against planted toe positions, so there is no foot sliding.
export function gait(t, o) {
  const { v, T, stance, reach = 0.22, phase = 0, hipH = 0.9, bob = 0.035, lift = 0.46, lean = 0.2 } = o;
  const legs = [0, 0.5].map((off) => {
    const u = t / T + off + phase;
    const k = Math.floor(u), p = u - k;
    const tTouch = (k - off - phase) * T;
    const X0 = v * tTouch + reach, X1 = X0 + v * T;
    let toe, ang;
    if (p < stance) { toe = [X0, 0]; ang = sstep(stance * 0.35, stance, p) * 1.05; }
    else {
      const s = (p - stance) / (1 - stance);
      // swing relative to the moving pelvis: heel kicks up behind, then the foot reaches forward
      const tNow = t, pxNow = v * tNow;
      const rel0 = X0 - v * (tTouch + stance * T), rel1 = reach;
      const f = Math.pow(Math.sin(s * Math.PI / 2), 1.5);
      toe = [pxNow + lerp(rel0, rel1, f), lift * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.9) * (1 - 0.5 * s)];
      ang = lerp(1.05, -0.12, sstep(0.05, 0.85, s));
    }
    // ankle from toe by rotating the flat foot vector (toe→ankle = (-0.17, 0.07)) heel-up by ang
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const ankle = [toe[0] - 0.17 * ca + 0.07 * sa, toe[1] + 0.17 * sa + 0.07 * ca];
    return { p, toe, ankle, ang, stanceNow: p < stance };
  });
  const u0 = t / T + phase;
  const px = v * t;
  const py = hipH + bob * Math.cos(TAU * 2 * (u0 - stance / 2)) * -1;
  const hip = [px, py];
  for (const L of legs) {
    const r = ik(hip, L.ankle, 0.47, 0.46, 1);
    L.knee = r.mid; L.ankle = r.end;
  }
  const up = [Math.sin(lean), Math.cos(lean)];
  const sh = [hip[0] + up[0] * 0.56, hip[1] + up[1] * 0.56];
  const arms = [0, 1].map((i) => {
    const sw = Math.sin(TAU * (u0 + (i === 0 ? 0.5 : 0))) * o.armSwing;
    const a1 = sw - lean * 0.3;
    const el = [sh[0] + Math.sin(a1) * 0.3, sh[1] - Math.cos(a1) * 0.3];
    const a2 = a1 + o.elbow;
    const hand = [el[0] + Math.sin(a2) * 0.27, el[1] - Math.cos(a2) * 0.27];
    return { el, hand };
  });
  const neck = [sh[0] + up[0] * 0.1, sh[1] + up[1] * 0.1];
  const head = [neck[0] + 0.035, neck[1] + 0.13];
  return { hip, legs, sh, arms, neck, head, lean, u0, px };
}
export const RUN = { v: 4.6, T: 0.7, stance: 0.3, reach: 0.24, hipH: 0.9, bob: 0.035, lift: 0.46, lean: 0.21, armSwing: 0.85, elbow: 1.55 };
export const WALK = { v: 1.35, T: 1.1, stance: 0.62, reach: 0.18, hipH: 0.93, bob: 0.015, lift: 0.12, lean: 0.04, armSwing: 0.32, elbow: 0.25 };

// Footfall times (touchdowns) of a gait, for sound sync.
export function footfalls(o, t0, t1) {
  const out = [];
  for (const off of [0, 0.5]) for (let k = -2; k < 400; k++) {
    const tt = (k - off - (o.phase || 0)) * o.T;
    if (tt >= t0 && tt < t1) out.push(tt);
  }
  return out.sort((a, b) => a - b);
}

function shoeSide(g, T, ankle, ang, col, hi) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (x, y) => [ankle[0] + x * ca + y * sa, ankle[1] - x * sa + y * ca];
  const pts = [R(-0.06, 0.02), R(-0.07, -0.05), R(-0.04, -0.075), R(0.15, -0.075), R(0.2, -0.06), R(0.19, -0.035), R(0.07, 0.0), R(0.02, 0.035)];
  smoothShape(g, P(T, pts), col);
  const a = tr(T, ...R(0.03, -0.022)), b = tr(T, ...R(0.16, -0.045));
  g.strokeStyle = hi; g.lineWidth = Math.max(1, T.s * 0.008); g.lineCap = 'round';
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
}

// Head in profile (facing +x), centred at c. expr: {eye:0..1 open, brow, look}
export function headProfile(g, T, c, pal, expr = {}, hat = true, style = 'man') {
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  const s = T.s;
  // neck
  smoothShape(g, [H(-0.035, -0.08), H(0.045, -0.09), H(0.04, -0.2), H(-0.05, -0.2)], pal.skinShade);
  // skull + face
  const face = [[-0.1, 0.03], [-0.07, 0.11], [0.02, 0.125], [0.085, 0.065], [0.093, 0.028], [0.09, 0.006], [0.126, -0.036], [0.104, -0.05], [0.104, -0.067], [0.096, -0.078], [0.101, -0.09], [0.09, -0.124], [0.035, -0.142], [-0.02, -0.115], [-0.06, -0.07], [-0.1, -0.02]];
  smoothShape(g, face.map((p) => H(p[0], p[1])), pal.skin);
  // soft shade on the back half of the face
  smoothShape(g, [H(-0.1, 0.03), H(-0.02, 0.1), H(0.0, -0.03), H(0.0, -0.12), H(-0.06, -0.07), H(-0.1, -0.02)], pal.skinShade + '99');
  // ear
  g.save(); g.beginPath(); const e = H(-0.02, -0.012);
  g.ellipse(e[0], e[1], s * 0.017, s * 0.03, 0.15, 0, TAU); g.fillStyle = pal.skinShade; g.fill(); g.restore();
  // hair (nape / sideburn)
  if (style === 'man') smoothShape(g, [H(-0.1, 0.045), H(-0.03, 0.06), H(-0.005, 0.02), H(-0.03, -0.01), H(-0.07, -0.05), H(-0.1, -0.03)], pal.hair);
  // eye
  const open = expr.eye === undefined ? 1 : expr.eye;
  const ec = H(0.072, 0.006 + (expr.look || 0) * 0.0);
  g.save(); g.fillStyle = pal.eye || '#17120f';
  g.beginPath(); g.ellipse(ec[0], ec[1], s * 0.011, s * 0.006 * Math.max(0.15, open), 0, 0, TAU); g.fill(); g.restore();
  // brow
  const b0 = H(0.05, 0.03 + (expr.brow || 0) * 0.01), b1 = H(0.09, 0.03 + (expr.brow || 0) * 0.006);
  g.strokeStyle = pal.hair; g.lineWidth = s * 0.007; g.lineCap = 'round';
  g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.stroke();
  // mouth line
  const m0 = H(0.08, -0.079), m1 = H(0.1, -0.079);
  g.strokeStyle = pal.lip; g.lineWidth = s * 0.005;
  g.beginPath(); g.moveTo(m0[0], m0[1]); g.lineTo(m1[0], m1[1]); g.stroke();
  if (hat) hatProfile(g, T, c, pal);
}
export function hatProfile(g, T, c, pal) {
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  // crown
  smoothShape(g, [H(-0.088, 0.055), H(-0.083, 0.14), H(-0.03, 0.172), H(0.035, 0.162), H(0.068, 0.13), H(0.08, 0.055)], pal.hat);
  // front pinch shadow
  smoothShape(g, [H(0.02, 0.16), H(0.06, 0.13), H(0.07, 0.07), H(0.045, 0.08), H(0.03, 0.14)], pal.hatShade);
  // band
  poly2(g, [H(-0.088, 0.056), H(0.08, 0.056), H(0.078, 0.082), H(-0.087, 0.084)], pal.hatBand);
  // brim (slight snap-brim: down at front, up at back)
  smoothShape(g, [H(-0.16, 0.07), H(-0.1, 0.05), H(0.05, 0.047), H(0.17, 0.03), H(0.175, 0.018), H(0.05, 0.034), H(-0.1, 0.04), H(-0.165, 0.062)], pal.hat);
}

// Businessman, side view, running (or walking) — facing +x.
export function manSide(g, T, pose, opts = {}) {
  const pal = MAN;
  const { hip, legs, sh, arms, neck, head, lean } = pose;
  const near = opts.nearLeg ?? 1; // which leg index is on the camera side
  const far = 1 - near;
  const up = [Math.sin(lean), Math.cos(lean)], fw = [Math.cos(lean), -Math.sin(lean)];
  const TF = (f, u) => [hip[0] + fw[0] * f + up[0] * u, hip[1] + fw[1] * f + up[1] * u];
  const s = T.s;
  // far arm
  drawArmSide(g, T, sh, arms[far], pal.coatDeep, pal.skinShade, 0.95);
  // far leg
  drawLegSide(g, T, hip, legs[far], pal.trousersShade, pal.shoe, pal.shoeHi, 0.9);
  // near leg
  drawLegSide(g, T, hip, legs[near], pal.trousers, pal.shoe, pal.shoeHi, 1);
  // coat skirt: front edge follows the forward knee, back hem flares with speed
  const kf = legs[0].knee[0] > legs[1].knee[0] ? legs[0].knee : legs[1].knee;
  const flare = (opts.flare ?? 1) * (0.2 + 0.07 * Math.sin(TAU * (pose.u0 * 2 + 0.2)));
  const hemY = 0.46 + (opts.flare ?? 1) * (0.1 + 0.05 * Math.sin(TAU * (pose.u0 * 2 + 0.35)));
  const wb = TF(-0.12, 0.06), wf = TF(0.11, 0.06);
  const skirt = [wb, [wb[0] - 0.05 - flare * 0.4, lerp(wb[1], hemY, 0.5)], [hip[0] - 0.2 - flare, hemY + 0.02], [hip[0] - 0.05 - flare * 0.4, hemY - 0.03], [kf[0] - 0.06, hemY - 0.02], [kf[0] + 0.07, kf[1] - 0.02], [wf[0] + 0.02, wf[1] - 0.12], wf];
  smoothShape(g, P(T, skirt), pal.coat);
  // inner fold shading in the skirt
  smoothShape(g, P(T, [TF(-0.02, 0.02), [hip[0] - 0.05 - flare * 0.5, hemY + 0.02], [hip[0] + 0.02, hemY + 0.04], TF(0.04, 0.0)]), pal.coatShade);
  // torso
  const torso = [TF(-0.12, 0.08), TF(-0.13, 0.32), TF(-0.11, 0.52), TF(-0.06, 0.6), TF(0.07, 0.61), TF(0.13, 0.46), TF(0.12, 0.2), TF(0.11, 0.06)];
  smoothShape(g, P(T, torso), pal.coat);
  smoothShape(g, P(T, [TF(-0.12, 0.08), TF(-0.13, 0.32), TF(-0.11, 0.5), TF(-0.05, 0.3), TF(-0.05, 0.09)]), pal.coatShade);
  // belt
  poly2(g, P(T, [TF(-0.125, 0.07), TF(0.115, 0.07), TF(0.117, 0.115), TF(-0.128, 0.115)]), pal.belt);
  // raised collar
  smoothShape(g, P(T, [TF(-0.08, 0.58), TF(-0.06, 0.69), TF(0.0, 0.71), TF(0.06, 0.63), TF(0.02, 0.58)]), pal.coatShade);
  // head
  headProfile(g, T, head, pal, opts.expr || { eye: 1 });
  // near arm on top
  drawArmSide(g, T, sh, arms[near], pal.coat, pal.skin, 1);
}
function drawArmSide(g, T, sh, arm, sleeve, skin, k) {
  const a = tr(T, ...sh), e = tr(T, ...arm.el), h = tr(T, ...arm.hand);
  capsule(g, a, e, T.s * 0.07, T.s * 0.058, sleeve);
  capsule(g, e, h, T.s * 0.058, T.s * 0.05, sleeve);
  g.beginPath(); g.arc(h[0], h[1], T.s * 0.043, 0, TAU); g.fillStyle = skin; g.fill();
}
function drawLegSide(g, T, hip, L, col, shoe, hi) {
  const a = tr(T, ...hip), k = tr(T, ...L.knee), an = tr(T, ...L.ankle);
  capsule(g, a, k, T.s * 0.08, T.s * 0.062, col);
  capsule(g, k, an, T.s * 0.06, T.s * 0.047, col);
  shoeSide(g, T, L.ankle, L.ang, shoe, hi);
}

// ------------------------------------------------------------------ customers, side view (silhouette runners)
export function personSide(g, T, pose, c, opts = {}) {
  const { hip, legs, sh, arms, head, lean } = pose;
  const k = c.h / 1.8;
  const up = [Math.sin(lean), Math.cos(lean)], fw = [Math.cos(lean), -Math.sin(lean)];
  const TF = (f, u) => [hip[0] + fw[0] * f * c.w + up[0] * u, hip[1] + fw[1] * f * c.w + up[1] * u];
  drawArmSide(g, T, sh, arms[0], c.topShade, c.skinShade);
  drawLegSide(g, T, hip, legs[0], c.bottom, c.shoe, c.shoe);
  drawLegSide(g, T, hip, legs[1], c.bottom, c.shoe, c.shoe);
  const torso = [TF(-0.12, 0.02), TF(-0.13, 0.32), TF(-0.1, 0.55), TF(0.07, 0.6), TF(0.13, 0.42), TF(0.11, 0.04)];
  if (c.style === 'phone') torso.push(TF(0.1, -0.2));
  smoothShape(g, P(T, torso), c.top);
  if (c.id === 'phone') smoothShape(g, P(T, [TF(-0.12, 0.05), TF(-0.2, -0.3), TF(0.08, -0.32), TF(0.11, 0.05)]), c.top); // long coat
  headProfile(g, T, head, { ...c, eye: '#141110', hair: c.hair }, { eye: 1 }, false, 'none');
  hairProfile(g, T, head, c);
  drawArmSide(g, T, sh, arms[1], c.top, c.skin);
  // carried prop (kept small and unreadable in silhouette shots)
  const h = arms[1].hand;
  if (opts.props !== false) propSide(g, T, h, c.prop);
}
function hairProfile(g, T, c0, c) {
  const H = (x, y) => tr(T, c0[0] + x, c0[1] + y);
  if (c.style === 'bob') smoothShape(g, [H(-0.11, 0.02), H(-0.08, 0.13), H(0.03, 0.14), H(0.09, 0.08), H(0.07, 0.04), H(0.0, 0.07), H(-0.02, -0.02), H(-0.05, -0.1), H(-0.12, -0.08)], c.hair);
  else if (c.style === 'short') smoothShape(g, [H(-0.105, 0.02), H(-0.07, 0.125), H(0.04, 0.135), H(0.09, 0.08), H(0.05, 0.075), H(-0.01, 0.06), H(-0.03, 0.0), H(-0.09, -0.04)], c.hair);
  else if (c.style === 'ponytail') { smoothShape(g, [H(-0.105, 0.02), H(-0.07, 0.125), H(0.04, 0.135), H(0.09, 0.08), H(0.04, 0.07), H(-0.03, 0.02), H(-0.09, -0.03)], c.hair); smoothShape(g, [H(-0.1, 0.06), H(-0.2, 0.0), H(-0.23, -0.12), H(-0.16, -0.05), H(-0.11, 0.0)], c.hair); }
  else if (c.style === 'bun') { smoothShape(g, [H(-0.105, 0.02), H(-0.07, 0.125), H(0.04, 0.135), H(0.09, 0.08), H(0.04, 0.07), H(-0.03, 0.02), H(-0.09, -0.03)], c.hair); const b = H(-0.08, 0.12); g.beginPath(); g.arc(b[0], b[1], T.s * 0.045, 0, TAU); g.fillStyle = c.hair; g.fill(); }
  else if (c.style === 'cap') { smoothShape(g, [H(-0.1, 0.03), H(-0.06, 0.12), H(0.05, 0.12), H(0.1, 0.07), H(0.16, 0.055), H(0.1, 0.045), H(-0.09, 0.02)], '#4b4740'); smoothShape(g, [H(-0.09, 0.02), H(-0.1, -0.05), H(-0.05, -0.02)], c.hair); }
}
function propSide(g, T, h, prop) {
  const X = (x, y) => tr(T, h[0] + x, h[1] + y);
  if (prop === 'lamp') { poly2(g, [X(-0.02, 0), X(0.02, 0), X(0.1, 0.22), X(0.07, 0.24)], '#2d3035'); smoothShape(g, [X(0.04, 0.22), X(0.2, 0.3), X(0.22, 0.2), X(0.1, 0.17)], '#34373c'); }
  else if (prop === 'plan') capsule(g, X(-0.16, -0.12), X(0.22, 0.14), T.s * 0.035, T.s * 0.035, '#cfc8b8');
  else if (prop === 'box') poly2(g, [X(-0.13, -0.08), X(0.15, -0.08), X(0.15, 0.14), X(-0.13, 0.14)], '#8e704f');
  else if (prop === 'folder') poly2(g, [X(-0.03, -0.14), X(0.03, -0.14), X(0.05, 0.18), X(-0.01, 0.18)], '#33373e');
  else if (prop === 'phone') poly2(g, [X(-0.02, -0.02), X(0.03, -0.02), X(0.035, 0.08), X(-0.015, 0.08)], '#141518');
}

// ------------------------------------------------------------------ front-facing faces
// expr: {yaw, eyeL, eyeR, gazeX, gazeY, brow, knit, smile, open, squint, tilt}
export function faceFront(g, T, c, pal, expr = {}, kind = 'man', lightSide = -1) {
  const yaw = expr.yaw || 0, s = T.s;
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  const fx = (x) => x * (1 - Math.abs(yaw) * 0.18) + yaw * 0.03;
  const feat = (x) => x * (1 - Math.abs(yaw) * 0.25) + yaw * 0.048;
  g.save();
  if (expr.tilt) { const o = H(0, -0.05); g.translate(o[0], o[1]); g.rotate(expr.tilt); g.translate(-o[0], -o[1]); }
  // neck
  poly2(g, [H(-0.045, -0.08), H(0.045, -0.08), H(0.05, -0.2), H(-0.05, -0.2)], pal.skinShade);
  // hair behind (long styles)
  if (kind === 'bob') smoothShape(g, [H(-0.1, 0.06), H(-0.095, -0.12), H(-0.06, -0.14), H(0.06, -0.14), H(0.095, -0.12), H(0.1, 0.06)].map((p) => p), pal.hair);
  // ears
  for (const sd of [-1, 1]) {
    const vis = 1 - clamp(sd * yaw * 2.2);
    if (vis <= 0.05 || kind === 'bob') continue;
    const e = H(fx(sd * 0.079), -0.01);
    g.beginPath(); g.ellipse(e[0], e[1], s * 0.014 * vis, s * 0.028, 0, 0, TAU); g.fillStyle = pal.skinShade; g.fill();
  }
  // face
  const face = [[0, 0.125], [0.066, 0.108], [0.078, 0.045], [0.076, -0.028], [0.063, -0.083], [0.036, -0.118], [0, -0.13], [-0.036, -0.118], [-0.063, -0.083], [-0.076, -0.028], [-0.078, 0.045], [-0.066, 0.108]];
  smoothShape(g, face.map((p) => H(fx(p[0]), p[1])), pal.skin);
  g.save(); smoothShape(g, face.map((p) => H(fx(p[0]), p[1]))); g.clip();
  { // soft modelling: jaw falloff, eye sockets, warm cheeks
    const jc = H(feat(0), -0.13), jr = s * 0.12;
    let gr = g.createRadialGradient(jc[0], jc[1], 0, jc[0], jc[1], jr);
    gr.addColorStop(0, 'rgba(60,35,25,0.18)'); gr.addColorStop(1, 'rgba(60,35,25,0)'); g.fillStyle = gr; g.fillRect(jc[0] - jr, jc[1] - jr, jr * 2, jr * 2);
    for (const sd of [-1, 1]) {
      const ec = H(feat(sd * 0.034), 0.02), er = s * 0.03;
      gr = g.createRadialGradient(ec[0], ec[1], 0, ec[0], ec[1], er); gr.addColorStop(0, 'rgba(70,40,30,0.16)'); gr.addColorStop(1, 'rgba(70,40,30,0)');
      g.fillStyle = gr; g.fillRect(ec[0] - er, ec[1] - er, er * 2, er * 2);
      const cc = H(feat(sd * 0.045), -0.035), cr = s * 0.03;
      gr = g.createRadialGradient(cc[0], cc[1], 0, cc[0], cc[1], cr); gr.addColorStop(0, 'rgba(190,90,70,0.10)'); gr.addColorStop(1, 'rgba(190,90,70,0)');
      g.fillStyle = gr; g.fillRect(cc[0] - cr, cc[1] - cr, cr * 2, cr * 2);
    }
    const fh = H(feat(0.0), 0.085), fr = s * 0.07;
    gr = g.createRadialGradient(fh[0], fh[1], 0, fh[0], fh[1], fr); gr.addColorStop(0, 'rgba(255,235,210,0.10)'); gr.addColorStop(1, 'rgba(255,235,210,0)');
    g.fillStyle = gr; g.fillRect(fh[0] - fr, fh[1] - fr, fr * 2, fr * 2);
  }
  g.restore();
  // side shading (away from the light)
  const sh = lightSide;
  smoothShape(g, [H(fx(-sh * 0.078), 0.06), H(fx(-sh * 0.05), 0.05), H(fx(-sh * 0.042), -0.03), H(fx(-sh * 0.03), -0.11), H(fx(-sh * 0.06), -0.09), H(fx(-sh * 0.077), -0.03)], pal.skinShade + '77');
  // beard
  if (pal.beard) smoothShape(g, [H(fx(-0.07), -0.04), H(fx(-0.045), -0.1), H(0, -0.135), H(fx(0.045), -0.1), H(fx(0.07), -0.04), H(fx(0.03), -0.07), H(0, -0.06), H(fx(-0.03), -0.07)], pal.hair);
  // eyes
  const open = [expr.eyeL ?? 1, expr.eyeR ?? 1];
  const squint = expr.squint || 0;
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    const ex = feat(sd * 0.034), ey = 0.012 - squint * 0.002;
    const cc = H(ex, ey);
    const wx = s * 0.0135 * (1 - (sd * yaw > 0 ? 0 : Math.abs(yaw) * 0.35)), hy = s * 0.0068 * Math.max(0.06, open[i] * (1 - squint * 0.55));
    if (open[i] > 0.12) {
      g.beginPath(); g.ellipse(cc[0], cc[1], wx, hy, 0, 0, TAU); g.fillStyle = '#ddd3c6'; g.fill();
      g.save(); g.clip();
      const ir = H(ex + (expr.gazeX || 0) * 0.009, ey + (expr.gazeY || 0) * 0.004);
      g.beginPath(); g.arc(ir[0], ir[1], s * 0.0072, 0, TAU); g.fillStyle = pal.eye || '#1a1411'; g.fill();
      g.restore();
      // upper lid
      g.beginPath(); g.ellipse(cc[0], cc[1], wx * 1.05, hy, 0, Math.PI, TAU); g.strokeStyle = '#21160f'; g.lineWidth = s * 0.0032; g.stroke();
    } else {
      // closed (wink / squeeze): a soft curved lid line
      g.beginPath(); g.moveTo(cc[0] - wx, cc[1]); g.quadraticCurveTo(cc[0], cc[1] + s * 0.005, cc[0] + wx, cc[1] - s * 0.001);
      g.strokeStyle = '#2a1c14'; g.lineWidth = s * 0.0042; g.lineCap = 'round'; g.stroke();
    }
  }
  // brows
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    const br = (expr.brow || 0) + (i === 0 ? expr.browL || 0 : expr.browR || 0);
    const inner = H(feat(sd * 0.016), 0.036 + br * 0.008 - (expr.knit || 0) * 0.006);
    const outer = H(feat(sd * 0.052), 0.035 + br * 0.005 + (expr.knit || 0) * 0.002);
    g.beginPath(); g.moveTo(inner[0], inner[1]); g.quadraticCurveTo((inner[0] + outer[0]) / 2, Math.min(inner[1], outer[1]) - s * 0.004, outer[0], outer[1]);
    g.strokeStyle = pal.brow || pal.hair; g.lineWidth = s * 0.0065; g.lineCap = 'round'; g.stroke();
  }
  // nose: shadow plane + base
  const n0 = H(feat(0.0), 0.02), n1 = H(feat(0.012 * -sh) + yaw * 0.012, -0.045), n2 = H(feat(-0.012 * sh), -0.052);
  poly2(g, [n0, n1, n2], pal.skinShade + 'cc');
  const nb = H(feat(0) + yaw * 0.01, -0.05);
  g.beginPath(); g.ellipse(nb[0], nb[1], s * 0.013, s * 0.004, 0, 0, TAU); g.fillStyle = pal.skinShade; g.fill();
  // mouth
  const sm = expr.smile || 0, op = expr.open || 0;
  const ml = H(feat(-0.022 - sm * 0.003), -0.077 + sm * 0.004), mr = H(feat(0.022 + sm * 0.003), -0.077 + sm * 0.006 + (expr.smirk || 0) * 0.004);
  const mc = H(feat(0), -0.079 - sm * 0.003);
  if (op > 0.05) {
    g.beginPath(); g.moveTo(ml[0], ml[1]); g.quadraticCurveTo(mc[0], mc[1] + s * op * 0.02, mr[0], mr[1]); g.quadraticCurveTo(mc[0], mc[1] - s * 0.002, ml[0], ml[1]);
    g.fillStyle = '#3a1e18'; g.fill();
  }
  g.beginPath(); g.moveTo(ml[0], ml[1]); g.quadraticCurveTo(mc[0], mc[1] + s * sm * 0.006, mr[0], mr[1]);
  g.strokeStyle = pal.lip; g.lineWidth = s * 0.0048; g.lineCap = 'round'; g.stroke();
  // lower-lip light
  const ll = H(feat(0), -0.088);
  g.beginPath(); g.ellipse(ll[0], ll[1], s * 0.012, s * 0.003, 0, 0, TAU); g.fillStyle = pal.skinShade + '88'; g.fill();
  // glasses
  if (pal.glasses) {
    g.strokeStyle = '#1b1b1d'; g.lineWidth = s * 0.004;
    for (const sd of [-1, 1]) { const q = H(feat(sd * 0.034), 0.01); g.beginPath(); g.roundRect(q[0] - s * 0.024, q[1] - s * 0.016, s * 0.048, s * 0.03, s * 0.008); g.stroke(); }
    const a = H(feat(-0.01), 0.012), b = H(feat(0.01), 0.012); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // hair (front)
  hairFront(g, T, c, pal, kind, fx);
  g.restore();
}
function hairFront(g, T, c, pal, kind, fx) {
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  if (kind === 'man') { // temples under the hat brim
    for (const sd of [-1, 1]) smoothShape(g, [H(fx(sd * 0.078), 0.07), H(fx(sd * 0.06), 0.1), H(fx(sd * 0.066), 0.045), H(fx(sd * 0.079), 0.02)], pal.hair);
  } else if (kind === 'bob') {
    smoothShape(g, [H(fx(-0.1), 0.02), H(fx(-0.09), 0.12), H(0, 0.165), H(fx(0.09), 0.12), H(fx(0.1), 0.02), H(fx(0.085), -0.1), H(fx(0.07), -0.06), H(fx(0.06), 0.08), H(fx(0.0), 0.1), H(fx(-0.06), 0.085), H(fx(-0.07), -0.06), H(fx(-0.085), -0.1)], pal.hair);
  } else if (kind === 'short') {
    smoothShape(g, [H(fx(-0.08), 0.03), H(fx(-0.075), 0.12), H(0, 0.158), H(fx(0.075), 0.125), H(fx(0.08), 0.04), H(fx(0.066), 0.08), H(fx(0.02), 0.11), H(fx(-0.06), 0.1)], pal.hair);
  } else if (kind === 'ponytail' || kind === 'bun') {
    smoothShape(g, [H(fx(-0.08), 0.02), H(fx(-0.074), 0.12), H(0, 0.158), H(fx(0.074), 0.12), H(fx(0.08), 0.02), H(fx(0.064), 0.09), H(fx(0.0), 0.118), H(fx(-0.064), 0.09)], pal.hair);
    if (kind === 'bun') { const b = H(0, 0.175); g.beginPath(); g.arc(b[0], b[1], T.s * 0.042, 0, TAU); g.fillStyle = pal.hair; g.fill(); }
  } else if (kind === 'cap') {
    smoothShape(g, [H(fx(-0.084), 0.05), H(fx(-0.08), 0.12), H(0, 0.15), H(fx(0.08), 0.12), H(fx(0.084), 0.05)], '#4b4740');
    smoothShape(g, [H(fx(-0.09), 0.06), H(fx(0.09), 0.06), H(fx(0.1), 0.035), H(0, 0.02), H(fx(-0.1), 0.035)], '#3a3732');
    for (const sd of [-1, 1]) smoothShape(g, [H(fx(sd * 0.079), 0.04), H(fx(sd * 0.07), 0.05), H(fx(sd * 0.072), -0.01), H(fx(sd * 0.08), -0.02)], pal.hair);
  }
}
export function hatFront(g, T, c, pal, yaw = 0) {
  const H = (x, y) => tr(T, c[0] + x + yaw * 0.02, c[1] + y);
  smoothShape(g, [H(-0.082, 0.07), H(-0.078, 0.15), H(-0.02, 0.182), H(0.0, 0.168), H(0.02, 0.182), H(0.078, 0.15), H(0.082, 0.07)], pal.hat);
  smoothShape(g, [H(-0.012, 0.172), H(0.0, 0.1), H(0.012, 0.172), H(0.0, 0.165)], pal.hatShade);
  poly2(g, [H(-0.083, 0.072), H(0.083, 0.072), H(0.083, 0.098), H(-0.083, 0.098)], pal.hatBand);
  // brim seen slightly from below: a thin ellipse, front dipping
  const b = H(0, 0.066);
  g.save(); g.beginPath(); g.ellipse(b[0], b[1], T.s * 0.155, T.s * 0.022, 0, 0, TAU); g.fillStyle = pal.hat; g.fill();
  g.beginPath(); g.ellipse(b[0], b[1] + T.s * 0.006, T.s * 0.14, T.s * 0.014, 0, 0, Math.PI); g.fillStyle = pal.hatShade; g.fill(); g.restore();
}

// ------------------------------------------------------------------ businessman, front view (standing / cowering)
// pose: {breath, crouch 0..1, cover 0..1 (raising the coat), head:{...expr}, lookDown, armsOut}
export function manFront(g, T, pose = {}) {
  const pal = MAN;
  const cr = pose.crouch || 0, cov = pose.cover || 0, br = pose.breath || 0;
  const hy = 0.92 - cr * 0.1; // hip height
  const shY = 1.47 - cr * 0.12 + br * 0.008 + cov * 0.05;
  const shW = 0.215 - cov * 0.035;
  const headC = [pose.headX || 0, 1.66 - cr * 0.14 + br * 0.006 - cov * 0.02 + (pose.headDrop || 0)];
  // legs
  for (const sd of [-1, 1]) {
    const hip = [sd * 0.095, hy], knee = [sd * (0.1 + cr * 0.06), hy * 0.52], ank = [sd * 0.11, 0.09];
    capsule(g, tr(T, ...hip), tr(T, ...knee), T.s * 0.08, T.s * 0.066, sd < 0 ? pal.trousers : pal.trousersShade);
    capsule(g, tr(T, ...knee), tr(T, ...ank), T.s * 0.065, T.s * 0.05, sd < 0 ? pal.trousers : pal.trousersShade);
    smoothShape(g, P(T, [[sd * 0.11 - 0.055, 0.0], [sd * 0.11 - 0.06, 0.06], [sd * 0.11, 0.1], [sd * 0.11 + 0.06, 0.06], [sd * 0.11 + 0.055, 0.0]]), pal.shoe);
  }
  // coat skirt (A-line, closed & belted)
  const hem = 0.44 - cr * 0.06;
  smoothShape(g, P(T, [[-0.2, hy + 0.12], [-0.29 - cr * 0.05, hem + 0.02], [-0.1, hem - 0.02], [0.1, hem - 0.02], [0.29 + cr * 0.05, hem + 0.02], [0.2, hy + 0.12]]), pal.coat);
  smoothShape(g, P(T, [[0.02, hy + 0.12], [0.02, hem - 0.01], [0.29 + cr * 0.05, hem + 0.02], [0.2, hy + 0.12]]), pal.coatShade);
  // torso
  const waist = hy + 0.12;
  smoothShape(g, P(T, [[-shW - 0.02, shY - 0.03], [-shW, shY - 0.3], [-0.19, waist], [0.19, waist], [shW, shY - 0.3], [shW + 0.02, shY - 0.03], [0.1, shY + 0.03], [-0.1, shY + 0.03]]), pal.coat);
  smoothShape(g, P(T, [[0.02, shY], [0.02, waist], [0.19, waist], [shW, shY - 0.3], [shW + 0.02, shY - 0.03], [0.1, shY + 0.03]]), pal.coatShade);
  // shirt / tie V
  if (cov < 0.6) {
    const vB = shY - 0.24;
    poly2(g, P(T, [[-0.07, shY + 0.02], [0.07, shY + 0.02], [0.0, vB]]), pal.shirt);
    poly2(g, P(T, [[-0.014, shY + 0.0], [0.014, shY + 0.0], [0.02, vB + 0.06], [0.0, vB + 0.02], [-0.02, vB + 0.06]]), pal.tie);
    poly2(g, P(T, [[-0.1, shY + 0.03], [-0.03, shY - 0.01], [0.0, vB - 0.02], [-0.02, vB - 0.02], [-0.1, shY - 0.16]]), pal.coatLight);
    poly2(g, P(T, [[0.1, shY + 0.03], [0.03, shY - 0.01], [0.0, vB - 0.02], [0.02, vB - 0.02], [0.1, shY - 0.16]]), pal.coatDeep);
  }
  // belt + buttons
  poly2(g, P(T, [[-0.195, waist - 0.02], [0.195, waist - 0.02], [0.195, waist + 0.03], [-0.195, waist + 0.03]]), pal.belt);
  for (const [x, y] of [[-0.06, shY - 0.3], [0.06, shY - 0.3], [-0.06, shY - 0.4], [0.06, shY - 0.4]]) { const b = tr(T, x, y); g.beginPath(); g.arc(b[0], b[1], T.s * 0.011, 0, TAU); g.fillStyle = pal.button; g.fill(); }
  // head
  faceFront(g, T, headC, pal, pose.head || {}, 'man', pose.lightSide ?? -1);
  hatFront(g, T, headC, pal, (pose.head && pose.head.yaw) || 0);
  // raised coat: collar + lapels pulled up around the face
  if (cov > 0.01) {
    const top = lerp(shY + 0.03, headC[1] - 0.02, cov);
    for (const sd of [-1, 1]) {
      smoothShape(g, P(T, [[sd * (shW + 0.02), shY - 0.02], [sd * (0.14 - cov * 0.02), top + 0.02], [sd * (0.03 * (1 - cov)), top - 0.03 * cov], [sd * 0.02, shY - 0.2], [sd * 0.12, shY - 0.3]]), sd < 0 ? pal.coat : pal.coatShade);
    }
  } else {
    for (const sd of [-1, 1]) smoothShape(g, P(T, [[sd * 0.1, shY + 0.03], [sd * 0.12, shY + 0.1], [sd * 0.05, shY + 0.07], [sd * 0.035, shY]]), pal.coatShade);
  }
  // arms: at sides, or hands gripping the raised lapels
  for (const sd of [-1, 1]) {
    const sh = [sd * (shW + 0.01), shY - 0.05];
    let el, hand;
    if (cov > 0.01) {
      el = [sd * lerp(0.29, 0.27, cov), lerp(shY - 0.3, shY - 0.2, cov)];
      hand = [sd * lerp(0.28, 0.08, cov), lerp(0.82 - cr * 0.08, headC[1] - 0.1, cov)];
    } else {
      const out = pose.armsOut || 0;
      el = [sd * (0.28 + out * 0.05), shY - 0.3];
      hand = [sd * (0.3 + out * 0.12), 0.82 - cr * 0.08 + out * 0.1];
    }
    const col = sd < 0 ? pal.coat : pal.coatShade;
    capsule(g, tr(T, ...sh), tr(T, ...el), T.s * 0.068, T.s * 0.058, col);
    capsule(g, tr(T, ...el), tr(T, ...hand), T.s * 0.058, T.s * 0.05, col);
    const hp = tr(T, ...hand), ep = tr(T, ...el);
    fist(g, hp, T.s, Math.atan2(hp[1] - ep[1], hp[0] - ep[0]) - Math.PI / 2, sd < 0 ? pal.skin : pal.skinShade, pal.skinShade, -sd);
  }
  return { head: headC, shY };
}

// Businessman, back view (standing or running away). run: phase or null
export function manBack(g, T, pose = {}) {
  const pal = MAN;
  const ph = pose.phase, running = ph !== undefined && ph !== null;
  const amp = running ? (pose.amp ?? 1) : 0;
  const sway = running ? Math.sin(TAU * ph) * 0.02 * amp : 0;
  const bob = running ? Math.abs(Math.sin(TAU * ph)) * 0.035 * amp : 0;
  const hy = 0.9 + bob;
  const shY = 1.46 + bob + (pose.hunch || 0) * 0.04 + (pose.breath || 0) * 0.014;
  const turn = pose.turn || 0; // 0 back → 1 (squash toward profile as he starts to turn)
  const sx = 1 - turn * 0.35;
  const X = (x, y) => tr(T, (x * sx) + sway, y);
  // legs
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    let lift = 0;
    if (running) lift = Math.max(0, Math.sin(TAU * (ph + i * 0.5))) * amp;
    const ank = [sd * 0.1, 0.09 + lift * 0.34], knee = [sd * 0.11, 0.48 + lift * 0.12];
    capsule(g, X(sd * 0.09, hy), X(knee[0], knee[1]), T.s * 0.08, T.s * 0.066, pal.trousersShade);
    capsule(g, X(knee[0], knee[1]), X(ank[0], ank[1]), T.s * 0.064 * (1 - lift * 0.2), T.s * 0.05, pal.trousersShade);
    // sole / heel
    const a = X(ank[0], ank[1] - 0.06);
    g.beginPath(); g.ellipse(a[0], a[1], T.s * 0.055, T.s * (0.045 + lift * 0.05), 0, 0, TAU); g.fillStyle = lift > 0.3 ? '#3a2a21' : pal.shoe; g.fill();
  }
  // coat
  const hem = running ? 0.44 + amp * (0.06 + 0.06 * Math.sin(TAU * ph * 2)) : 0.44;
  const flap = running ? Math.sin(TAU * ph) * 0.05 * amp : 0;
  smoothShape(g, [X(-0.21, hy + 0.14), X(-0.29 + flap, hem + 0.03), X(0.0, hem - 0.02), X(0.29 + flap, hem + 0.03), X(0.21, hy + 0.14)], pal.coat);
  poly2(g, [X(-0.005, hy + 0.1), X(0.005, hy + 0.1), X(0.01 + flap * 0.3, hem), X(-0.01 + flap * 0.3, hem)], pal.coatDeep); // vent
  smoothShape(g, [X(-0.215, shY - 0.02), X(-0.225, shY - 0.3), X(-0.2, hy + 0.12), X(0.2, hy + 0.12), X(0.225, shY - 0.3), X(0.215, shY - 0.02), X(0.1, shY + 0.03), X(-0.1, shY + 0.03)], pal.coat);
  smoothShape(g, [X(-0.215, shY - 0.02), X(-0.225, shY - 0.3), X(-0.2, hy + 0.12), X(-0.08, hy + 0.12), X(-0.1, shY - 0.2)], pal.coatShade);
  poly2(g, [X(-0.2, hy + 0.1), X(0.2, hy + 0.1), X(0.2, hy + 0.15), X(-0.2, hy + 0.15)], pal.belt);
  // back yoke / storm flap
  smoothShape(g, [X(-0.2, shY - 0.02), X(-0.18, shY - 0.17), X(0.18, shY - 0.17), X(0.2, shY - 0.02)], pal.coatShade + 'aa');
  // arms
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    let sw = running ? Math.sin(TAU * (ph + i * 0.5 + 0.5)) * amp : 0;
    const sh = [sd * 0.215, shY - 0.05];
    const el = [sd * (0.27 + 0.04 * amp), shY - 0.3 + sw * 0.05];
    const hand = [sd * lerp(0.29, 0.2, amp), lerp(0.84, shY - 0.36, amp) + sw * 0.14];
    capsule(g, X(...sh), X(...el), T.s * 0.068, T.s * 0.058, sd < 0 ? pal.coatShade : pal.coat);
    capsule(g, X(...el), X(...hand), T.s * 0.058, T.s * 0.05, sd < 0 ? pal.coatShade : pal.coat);
    const hp = X(...hand); g.beginPath(); g.arc(hp[0], hp[1], T.s * 0.04, 0, TAU); g.fillStyle = pal.skinShade; g.fill();
  }
  // collar, nape, ears, hat
  const hc = [0, 1.66 + bob + (pose.hunch || 0) * 0.02];
  smoothShape(g, [X(-0.045, hc[1] - 0.2), X(0.045, hc[1] - 0.2), X(0.05, hc[1] - 0.06), X(-0.05, hc[1] - 0.06)], pal.skinShade);
  smoothShape(g, [X(-0.075, hc[1] + 0.06), X(-0.078, hc[1] - 0.07), X(-0.03, hc[1] - 0.1), X(0.03, hc[1] - 0.1), X(0.078, hc[1] - 0.07), X(0.075, hc[1] + 0.06)], pal.hair);
  for (const sd of [-1, 1]) { const e = X(sd * 0.08, hc[1] - 0.01); g.beginPath(); g.ellipse(e[0], e[1], T.s * 0.012, T.s * 0.027, 0, 0, TAU); g.fillStyle = pal.skinShade; g.fill(); }
  smoothShape(g, [X(-0.13, shY - 0.03), X(-0.1, shY + 0.1), X(0.0, shY + 0.12), X(0.1, shY + 0.1), X(0.13, shY - 0.03)], pal.coatShade);
  hatFront(g, { ...T, ox: T.ox + T.s * sway * T.dir }, [0 * sx, hc[1]], { ...pal, hatShade: pal.hat });
  return { head: hc };
}

// ------------------------------------------------------------------ customers, front view
// pose: {light: 'up'|'down'|'off' flashlight aim, lightOn, propUp 0..1, expr, breath, yaw}
export function personFront(g, T, c, pose = {}) {
  const k = c.h / 1.8, w = c.w;
  const S = (x, y) => tr(T, x * w, y * k);
  const shY = 1.46, hy = 0.9, hc = [0, 1.66];
  const br = pose.breath || 0;
  // legs / shoes (optionally walking toward the viewer)
  for (const sd of [-1, 1]) {
    const lift = pose.walk !== undefined ? Math.max(0, Math.sin(TAU * (pose.walk + (sd > 0 ? 0.5 : 0)))) : 0;
    const ay = 0.09 + lift * 0.1, ky = 0.5 + lift * 0.06;
    capsule(g, S(sd * 0.09, hy), S(sd * 0.1, ky), T.s * 0.07 * w, T.s * 0.06 * w, c.bottom);
    capsule(g, S(sd * 0.1, ky), S(sd * 0.1, ay), T.s * 0.06 * w, T.s * 0.052 * w, c.bottom);
    smoothShape(g, [S(sd * 0.1 - 0.055, ay - 0.09), S(sd * 0.1 - 0.055, ay - 0.035), S(sd * 0.1, ay), S(sd * 0.1 + 0.055, ay - 0.035), S(sd * 0.1 + 0.055, ay - 0.09)], c.shoe);
  }
  // body
  const long = c.id === 'phone';
  const bottomY = long ? 0.55 : 0.8;
  smoothShape(g, [S(-0.2, shY - 0.03 + br * 0.006), S(-0.21, shY - 0.35), S(-0.19, bottomY), S(0.19, bottomY), S(0.21, shY - 0.35), S(0.2, shY - 0.03 + br * 0.006), S(0.08, shY + 0.03), S(-0.08, shY + 0.03)], c.top);
  smoothShape(g, [S(0.03, shY), S(0.03, bottomY), S(0.19, bottomY), S(0.21, shY - 0.35), S(0.2, shY - 0.03)], c.topShade);
  if (c.id === 'plan') { poly2(g, [S(-0.07, shY + 0.02), S(0.07, shY + 0.02), S(0, shY - 0.2)], '#8d8f93'); } // shirt V under jacket
  if (c.id === 'box') { poly2(g, [S(-0.06, shY + 0.02), S(0.06, shY + 0.02), S(0, shY - 0.12)], '#c9c4b8'); for (let i = 0; i < 4; i++) { const b = S(0, shY - 0.18 - i * 0.12); g.beginPath(); g.arc(b[0], b[1], T.s * 0.01, 0, TAU); g.fillStyle = '#35322e'; g.fill(); } }
  if (c.id === 'folder') { poly2(g, [S(-0.06, shY + 0.02), S(0.06, shY + 0.02), S(0, shY - 0.15)], '#d1ccc2'); }
  // head
  const expr = pose.expr || {};
  faceFront(g, T, [hc[0] * w, hc[1] * k], { ...c, eye: '#16110e' }, expr, c.style === 'cap' ? 'cap' : c.style, pose.lightSide ?? 1);
  // arms, flashlight (right hand, screen-left for the figure) and prop (left hand)
  const shL = [-0.2, shY - 0.05], shR = [0.2, shY - 0.05];
  let fl = null;
  if (pose.light) {
    const aim = pose.aim ?? (pose.light === 'up' ? 1 : 0);
    const el = [-0.28, lerp(0.95, 1.18, aim)], hand = [lerp(-0.26, -0.18, aim), lerp(0.8, 1.26, aim)];
    capsule(g, S(...shL), S(...el), T.s * 0.064 * w, T.s * 0.054 * w, c.topShade);
    capsule(g, S(...el), S(...hand), T.s * 0.054 * w, T.s * 0.045 * w, c.topShade);
    fl = flashlight(g, T, S(...hand), aim, pose.lightOn || 0);
    fist(g, [S(...hand)[0], S(...hand)[1] + T.s * 0.01], T.s, 0, c.skinShade, c.skinShade, 1);
  } else {
    capsule(g, S(...shL), S(-0.27, 1.12), T.s * 0.064 * w, T.s * 0.054 * w, c.topShade);
    capsule(g, S(-0.27, 1.12), S(-0.27, 0.84), T.s * 0.054 * w, T.s * 0.045 * w, c.topShade);
  }
  const pu = pose.propUp ?? 1;
  const handR = [lerp(0.27, 0.1, pu), lerp(0.84, 1.12, pu)];
  const elR = [0.29, lerp(1.12, 1.05, pu)];
  capsule(g, S(...shR), S(...elR), T.s * 0.064 * w, T.s * 0.054 * w, c.top);
  capsule(g, S(...elR), S(...handR), T.s * 0.054 * w, T.s * 0.045 * w, c.top);
  propFront(g, T, S(...handR), c.prop, pose);
  fist(g, S(...handR), T.s, 0.3, c.skin, c.skinShade, -1);
  return { flashlight: fl, head: S(hc[0], hc[1]) };
}
function flashlight(g, T, h, aim, on) {
  const s = T.s;
  // body: seen from the front when aimed up at the viewer, from the side when hanging down
  if (aim > 0.5) {
    const lens = [h[0], h[1] - s * 0.05];
    g.beginPath(); g.arc(lens[0], lens[1], s * 0.034, 0, TAU); g.fillStyle = '#17181b'; g.fill();
    g.beginPath(); g.arc(lens[0], lens[1], s * 0.025, 0, TAU); g.fillStyle = on > 0 ? `rgba(255,244,222,${0.35 + on * 0.65})` : '#3a3c40'; g.fill();
    return { lens, r: s * 0.025, dir: 'viewer' };
  }
  const a = [h[0], h[1] - s * 0.02], b = [h[0] + s * 0.02, h[1] + s * 0.17];
  capsule(g, a, b, s * 0.02, s * 0.026, '#1a1b1e');
  g.beginPath(); g.ellipse(b[0], b[1] + s * 0.012, s * 0.026, s * 0.009, 0, 0, TAU); g.fillStyle = on > 0 ? '#fff4de' : '#3a3c40'; g.fill();
  return { lens: [b[0], b[1] + s * 0.012], r: s * 0.024, dir: 'down' };
}
export function propFront(g, T, h, prop, pose = {}) {
  const s = T.s;
  const X = (x, y) => [h[0] + s * x, h[1] - s * y];
  if (prop === 'lamp') {
    // desk lamp held against the chest: round base, jointed arm, cone shade with the bulb showing
    smoothShape(g, [X(-0.09, -0.07), X(0.09, -0.07), X(0.085, -0.035), X(-0.085, -0.035)], '#2a2d31');
    capsule(g, X(-0.02, -0.04), X(-0.07, 0.18), s * 0.013, s * 0.013, '#44484e');
    g.beginPath(); const j = X(-0.07, 0.18); g.arc(j[0], j[1], s * 0.02, 0, TAU); g.fillStyle = '#2f3237'; g.fill();
    capsule(g, X(-0.07, 0.18), X(0.07, 0.3), s * 0.012, s * 0.012, '#44484e');
    smoothShape(g, [X(0.04, 0.34), X(0.1, 0.36), X(0.2, 0.25), X(0.17, 0.2), X(0.05, 0.26)], '#4a4e55');
    g.beginPath(); const bl = X(0.14, 0.215); g.ellipse(bl[0], bl[1], s * 0.04, s * 0.016, -0.7, 0, TAU); g.fillStyle = '#d9d2bf'; g.fill();
  } else if (prop === 'plan') {
    capsule(g, X(-0.2, -0.1), X(0.16, 0.28), s * 0.038, s * 0.038, '#d6cfbf');
    const e = X(0.16, 0.28); g.beginPath(); g.ellipse(e[0], e[1], s * 0.03, s * 0.038, -0.8, 0, TAU); g.fillStyle = '#ece6d8'; g.fill();
    g.beginPath(); g.ellipse(e[0], e[1], s * 0.012, s * 0.016, -0.8, 0, TAU); g.fillStyle = '#b9b1a0'; g.fill();
    for (const u of [0.35, 0.62]) { const a = X(lerp(-0.2, 0.16, u) - 0.03, lerp(-0.1, 0.28, u) + 0.02), b = X(lerp(-0.2, 0.16, u) + 0.03, lerp(-0.1, 0.28, u) - 0.03); g.strokeStyle = '#4a5a6e'; g.lineWidth = s * 0.008; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  } else if (prop === 'phone') {
    const glowOn = pose.screen ?? 1;
    g.save(); g.translate(...X(0.0, 0.1)); g.rotate(-0.12);
    g.beginPath(); g.roundRect(-s * 0.04, -s * 0.08, s * 0.08, s * 0.16, s * 0.012); g.fillStyle = '#121316'; g.fill();
    g.beginPath(); g.roundRect(-s * 0.034, -s * 0.072, s * 0.068, s * 0.144, s * 0.008); g.fillStyle = `rgba(226,230,236,${0.25 + glowOn * 0.7})`; g.fill();
    // generic "request" symbol: calendar square with a check mark (no text)
    g.strokeStyle = `rgba(40,44,52,${0.4 + glowOn * 0.5})`; g.lineWidth = s * 0.005; g.lineJoin = 'round';
    g.beginPath(); g.roundRect(-s * 0.02, -s * 0.03, s * 0.04, s * 0.036, s * 0.004); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.02, -s * 0.018); g.lineTo(s * 0.02, -s * 0.018); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.009, -s * 0.004); g.lineTo(-s * 0.002, s * 0.003); g.lineTo(s * 0.011, -s * 0.01); g.stroke();
    for (let i = 0; i < 2; i++) { g.beginPath(); g.roundRect(-s * 0.022, s * (0.02 + i * 0.014), s * (0.044 - i * 0.014), s * 0.006, s * 0.003); g.fillStyle = `rgba(40,44,52,${0.25 + glowOn * 0.3})`; g.fill(); }
    g.restore();
  } else if (prop === 'box') {
    const a = X(-0.14, -0.04), b = X(0.16, 0.2);
    poly2(g, [a, [b[0], a[1]], b, [a[0], b[1]]], '#8f7050');
    poly2(g, [[a[0], b[1]], b, [b[0] - s * 0.03, b[1] - s * 0.035], [a[0] + s * 0.03, b[1] - s * 0.035]], '#a3845f');
    g.strokeStyle = '#d6c7a5'; g.lineWidth = s * 0.006;
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    g.beginPath(); g.moveTo(cx, a[1]); g.lineTo(cx, b[1]); g.moveTo(a[0], cy); g.lineTo(b[0], cy); g.stroke();
  } else if (prop === 'folder') {
    g.save(); g.translate(...X(0.0, 0.12)); g.rotate(-0.08);
    g.fillStyle = '#e4dfd4'; g.fillRect(-s * 0.1, -s * 0.15, s * 0.19, s * 0.27);
    g.fillStyle = '#353941'; g.beginPath(); g.roundRect(-s * 0.11, -s * 0.13, s * 0.22, s * 0.28, s * 0.01); g.fill();
    g.fillStyle = '#4a4f58'; g.fillRect(-s * 0.11, -s * 0.13, s * 0.22, s * 0.02);
    g.restore();
  }
}

// Customer seen from behind (foreground silhouettes in the flashlight shot). aim: 0..1 arm raised forward
export function personBack(g, T, c, aim = 1) {
  const k = c.h / 1.8, w = c.w;
  const S = (x, y) => tr(T, x * w, y * k);
  for (const sd of [-1, 1]) capsule(g, S(sd * 0.09, 0.9), S(sd * 0.1, 0.05), T.s * 0.07 * w, T.s * 0.055 * w, c.bottom);
  smoothShape(g, [S(-0.2, 1.43), S(-0.21, 1.1), S(-0.19, c.id === 'phone' ? 0.55 : 0.8), S(0.19, c.id === 'phone' ? 0.55 : 0.8), S(0.21, 1.1), S(0.2, 1.43), S(0.08, 1.49), S(-0.08, 1.49)], c.topShade);
  // raised arm (toward the alley) — foreshortened
  capsule(g, S(-0.2, 1.4), S(-0.16, lerp(1.0, 1.32, aim)), T.s * 0.064 * w, T.s * 0.05 * w, c.topShade);
  capsule(g, S(0.2, 1.4), S(0.28, 0.9), T.s * 0.064 * w, T.s * 0.05 * w, c.topShade);
  const hc = S(0, 1.66);
  smoothShape(g, [S(-0.045, 1.46), S(0.045, 1.46), S(0.05, 1.6), S(-0.05, 1.6)], c.skinShade);
  g.beginPath(); g.ellipse(hc[0], hc[1], T.s * 0.08 * w, T.s * 0.12 * k, 0, 0, TAU); g.fillStyle = c.hair; g.fill();
  if (c.style === 'cap') { g.beginPath(); g.ellipse(hc[0], hc[1] + T.s * 0.06, T.s * 0.088, T.s * 0.07, 0, Math.PI, TAU); g.fillStyle = '#4b4740'; g.fill(); }
  if (c.style === 'bun') { g.beginPath(); g.arc(hc[0], hc[1] - T.s * 0.1, T.s * 0.045, 0, TAU); g.fillStyle = c.hair; g.fill(); }
  if (c.style === 'ponytail') capsule(g, [hc[0], hc[1] - T.s * 0.02], [hc[0] + T.s * 0.01, hc[1] + T.s * 0.16], T.s * 0.03, T.s * 0.02, c.hair);
  if (c.style === 'bob') smoothShape(g, [S(-0.1, 1.72), S(-0.1, 1.54), S(0.1, 1.54), S(0.1, 1.72)], c.hair);
  return { hand: S(-0.16, lerp(1.0, 1.32, aim)) };
}

// ------------------------------------------------------------------ office: seated at the desk (upper body)
// pose: {yaw, expr, lean, handsY}
export function manSeated(g, T, pose = {}) {
  const pal = MAN;
  const lean = pose.lean || 0;
  const shY = 1.18 + lean * 0.02, hc = [0.02 + (pose.headX || 0), 1.37 + lean * 0.01];
  // torso in suit jacket
  smoothShape(g, P(T, [[-0.23, shY - 0.02], [-0.25, 0.72], [0.25, 0.72], [0.23, shY - 0.02], [0.09, shY + 0.04], [-0.09, shY + 0.04]]), pal.suit);
  smoothShape(g, P(T, [[0.03, shY], [0.03, 0.72], [0.25, 0.72], [0.23, shY - 0.02]]), pal.suitShade);
  poly2(g, P(T, [[-0.07, shY + 0.03], [0.07, shY + 0.03], [0.0, shY - 0.24]]), pal.shirt);
  poly2(g, P(T, [[-0.015, shY + 0.01], [0.015, shY + 0.01], [0.022, shY - 0.2], [0, shY - 0.23], [-0.022, shY - 0.2]]), pal.tie);
  poly2(g, P(T, [[-0.09, shY + 0.04], [-0.035, shY], [0.0, shY - 0.26], [-0.02, shY - 0.27], [-0.13, shY - 0.1]]), '#3a3d44');
  poly2(g, P(T, [[0.09, shY + 0.04], [0.035, shY], [0.0, shY - 0.26], [0.02, shY - 0.27], [0.13, shY - 0.1]]), pal.suitShade);
  faceFront(g, T, hc, pal, pose.expr || {}, 'man', pose.lightSide ?? 1);
  // short hair on top (no hat indoors) — same hair colour and hairline as under the hat
  const yaw = (pose.expr && pose.expr.yaw) || 0;
  const Hh = (x, y) => tr(T, hc[0] + x * (1 - Math.abs(yaw) * 0.18) + yaw * 0.03, hc[1] + y);
  smoothShape(g, [Hh(-0.08, 0.02), Hh(-0.079, 0.095), Hh(-0.045, 0.138), Hh(0.03, 0.145), Hh(0.074, 0.115), Hh(0.08, 0.03), Hh(0.068, 0.078), Hh(0.03, 0.098), Hh(-0.03, 0.094), Hh(-0.066, 0.068)], pal.hair);
  g.strokeStyle = '#4a3d33'; g.lineWidth = T.s * 0.003; g.lineCap = 'round';
  g.beginPath(); const hp0 = Hh(-0.035, 0.1), hp1 = Hh(-0.03, 0.136); g.moveTo(hp0[0], hp0[1]); g.lineTo(hp1[0], hp1[1]); g.stroke();
  g.strokeStyle = 'rgba(120,98,80,0.35)'; g.lineWidth = T.s * 0.004;
  g.beginPath(); const hl0 = Hh(0.0, 0.132), hl1 = Hh(0.06, 0.112); g.moveTo(hl0[0], hl0[1]); g.quadraticCurveTo((hl0[0] + hl1[0]) / 2, hl0[1] - T.s * 0.006, hl1[0], hl1[1]); g.stroke();
  // forearms resting toward the desk
  for (const sd of [-1, 1]) {
    const sh = [sd * 0.23, shY - 0.05], el = [sd * 0.3, 0.86], hand = [sd * 0.16, pose.handsY ?? 0.8];
    capsule(g, tr(T, ...sh), tr(T, ...el), T.s * 0.066, T.s * 0.056, sd < 0 ? pal.suit : pal.suitShade);
    capsule(g, tr(T, ...el), tr(T, ...hand), T.s * 0.056, T.s * 0.048, sd < 0 ? pal.suit : pal.suitShade);
    const hp = tr(T, ...hand), ep = tr(T, ...el);
    fist(g, hp, T.s, Math.atan2(hp[1] - ep[1], hp[0] - ep[0]) - Math.PI / 2, pal.skin, pal.skinShade, sd);
  }
  return { head: hc };
}

// Open hand pressed against a wall (close-up), palm facing the wall, seen from the side of the wall.
export function handOnWall(g, T, spread = 1) {
  const pal = MAN;
  // sleeve
  smoothShape(g, P(T, [[-0.45, -0.07], [-0.08, -0.06], [-0.05, 0.02], [-0.05, 0.085], [-0.45, 0.1]]), pal.coat);
  smoothShape(g, P(T, [[-0.45, -0.07], [-0.08, -0.06], [-0.07, 0.0], [-0.45, 0.0]]), pal.coatShade);
  poly2(g, P(T, [[-0.08, -0.058], [-0.055, -0.058], [-0.045, 0.084], [-0.07, 0.086]]), pal.shirt);
  // back of hand + four fingers + thumb (explicitly five digits)
  smoothShape(g, P(T, [[-0.05, -0.045], [0.05, -0.05], [0.085, -0.02], [0.09, 0.03], [0.07, 0.065], [-0.05, 0.07]]), pal.skin);
  const fingers = [[0.06, 0.055, 0.0], [0.085, 0.022, 0.0], [0.09, -0.012, 0.0], [0.078, -0.042, 0.0]];
  const lens = [0.075, 0.085, 0.082, 0.065];
  fingers.forEach((f, i) => {
    const a = f[1] * spread * 1.4;
    const tip = [f[0] + lens[i] * Math.cos(a * 1.5), f[1] + lens[i] * Math.sin(a * 1.5)];
    capsule(g, tr(T, f[0], f[1]), tr(T, ...tip), T.s * 0.0125, T.s * 0.011, i % 2 ? pal.skin : '#bd9072');
  });
  capsule(g, tr(T, -0.01, 0.06), tr(T, 0.04, 0.1), T.s * 0.016, T.s * 0.012, pal.skinShade);
  // knuckle shading
  smoothShape(g, P(T, [[0.02, -0.045], [0.07, -0.04], [0.07, 0.05], [0.03, 0.06]]), pal.skinShade + '66');
}
