// People: a 2.5D puppet. Joints live in 3D body space (x forward, y up, z to the body's left), are placed in
// the street with a yaw, projected by the street camera and drawn as clean outlined shapes.
// Walking comes from the footstep simulation in gait.js; this file finishes the pose (arms, props) and draws it.
import { W, H, TAU, clamp, lerp, sstep, easeIO, noise1, hex, rgb, mix, tintS, PAL, poly, smooth, ink, line, ell, rrectPath } from './core.js';
import { LW } from './street.js';
import { dims, armSwing } from './gait.js';

const frac = (x) => x - Math.floor(x);
const P_REF = 0.905; // reference pelvis height (× s) the upper-body heights are defined against

function armFrom(pose, side, ang, flex, spread = 0.06, twist = 0) {
  // arm hanging from the shoulder: ang = swing forward (rad), flex = elbow bend
  const { s } = pose, sh = pose[`sh${side}`];
  const sz = side === 'L' ? 1 : -1;
  const el = [sh[0] + Math.sin(ang) * pose.upper, sh[1] - Math.cos(ang) * pose.upper, sh[2] + sz * spread * s];
  const a2 = ang + flex;
  const wr = [el[0] + Math.sin(a2) * pose.fore, el[1] - Math.cos(a2) * pose.fore, el[2] + sz * (spread * 0.6 + twist) * s];
  pose[`el${side}`] = el; pose[`wr${side}`] = wr;
}

// arms for held props / gestures; returns true if the arm was set
function propArms(pose, P, which, walkAng = 0) {
  if (P.prop === 'coffee' && which === P.propSide) { armFrom(pose, which, 0.22 + walkAng * 0.15, 1.45, 0.05); return true; }
  if (P.prop === 'phone' && pose.lookPhone > 0.01) {
    const f = pose.lookPhone;
    if (which === 'R') { armFrom(pose, 'R', lerp(walkAng, 0.3, f), lerp(0.3, 1.55, f), lerp(0.06, 0.02, f), lerp(0, 0.08, f)); return true; }
  }
  if (P.prop === 'phone' && which === 'R') { armFrom(pose, 'R', walkAng * 0.6, 0.3, 0.07); return true; }
  if (P.prop === 'bagHand' && which === P.propSide) { armFrom(pose, which, walkAng * 0.35, 0.12, 0.1); return true; }
  return false;
}

// upper-body heights follow the pelvis, so the whole body rises and falls with each step
function upperBody(pose) {
  const dy = pose.pelvis[1] - P_REF * pose.s;
  pose.dy = dy; pose.waistY = 1.08 * pose.s + dy; pose.hemY = 0.62 * pose.s + dy;
  return pose;
}

// finish a simulated pose: arms (swinging with the gait, with a little follow-through) and props
export function finishPose(P, pose, t, opts = {}) {
  upperBody(pose);
  pose.lookPhone = opts.lookPhone || 0;
  const walk = pose.walk || 0, sc = pose.sc || 1;
  for (const side of ['R', 'L']) {
    const u = frac((pose.phase || 0) + (side === 'R' ? 0 : 0.5));
    const ang = armSwing(walk, sc, u) + (1 - walk) * (0.035 + 0.012 * Math.sin(t * 0.8 + P.seed + (side === 'R' ? 0 : 1.3)));
    const A = (0.2 + 0.14 * sc) * walk || 1;
    const flex = 0.14 + 0.1 * walk + 0.22 * Math.max(0, ang) / A * walk + 0.06 * walk * Math.sin(TAU * (u - 0.3));
    if (!propArms(pose, P, side, ang)) armFrom(pose, side, ang, flex, 0.06 + 0.01 * (1 - walk));
  }
  return pose;
}

export function seatedPose(P, t, opts = {}) {
  const d = dims(P), s = d.s;
  const pose = { s, thigh: d.thigh, shin: d.shin, upper: d.upper, fore: d.fore, sw: 0.158 * s * P.build * (P.fem ? 0.92 : 1), shY: 1.43 * s, neckY: 1.5 * s, headY: 1.635 * s };
  const seatY = 0.47, pelvisY = seatY + 0.07 * s;
  // seated heights: torso keeps its length above the seat
  const dy = pelvisY - P_REF * s;
  pose.shY += dy; pose.neckY += dy; pose.headY += dy;
  const lean = -0.04 + 0.01 * Math.sin(t * 0.6);
  const L = (y) => (y - pelvisY) * Math.sin(lean);
  pose.lean = lean; pose.pelvis = [0, pelvisY, 0];
  const breath = Math.sin(t * 1.7 + P.seed * 2) * 0.004 * s;
  pose.shL = [L(pose.shY) - 0.01 * s, pose.shY + breath, pose.sw]; pose.shR = [L(pose.shY) - 0.01 * s, pose.shY + breath, -pose.sw];
  pose.neck = [L(pose.neckY), pose.neckY, 0]; pose.head = [L(pose.headY) + 0.01 * s, pose.headY, 0];
  pose.hipL = [0, pelvisY, 0.092 * s]; pose.hipR = [0, pelvisY, -0.092 * s];
  for (const [side, dz] of [['R', 0], ['L', 0.02]]) {
    const hip = pose[`hip${side}`];
    const knee = [hip[0] + d.thigh * 0.98, pelvisY + 0.02 * s, hip[2] + dz];
    const ankle = [knee[0] + 0.06 * s, d.ankleH, hip[2] + dz];
    pose[`kn${side}`] = knee; pose[`an${side}`] = ankle; pose[`fp${side}`] = 0; pose[`fy${side}`] = 0;
  }
  const sip = opts.sip || 0;
  armFrom(pose, 'L', 0.9, 0.6, 0.06);
  armFrom(pose, 'R', lerp(0.75, 0.35, sip), lerp(0.6, 2.0, sip), 0.04);
  pose.lookPhone = 0; pose.walk = 0; pose.speed = 0;
  pose.dy = dy; pose.waistY = 1.08 * s + dy; pose.hemY = 0.62 * s + dy;
  return pose;
}

// ------------------------------------------------------------------ drawing
function capsule(ctx, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / d, ny = dx / d, ang = Math.atan2(dy, dx);
  ctx.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  ctx.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  ctx.arc(b[0], b[1], rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  ctx.arc(a[0], a[1], ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
}

// An anatomical limb along a two-segment chain (hip→knee→ankle, shoulder→elbow→wrist) with a width profile
// [t, front, back] (t: 0 start, 0.5 joint, 1 end). `fwd` is the body's forward direction on screen (x sign × strength).
function limb(ctx, a, j, b, prof, k, fwd) {
  const N = 16, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = u <= 0.5 ? [lerp(a[0], j[0], u * 2), lerp(a[1], j[1], u * 2)] : [lerp(j[0], b[0], u * 2 - 1), lerp(j[1], b[1], u * 2 - 1)];
    let q = 0; while (q < prof.length - 2 && u > prof[q + 1][0]) q++;
    const w = clamp((u - prof[q][0]) / (prof[q + 1][0] - prof[q][0])), e = w * w * (3 - 2 * w);
    pts.push({ p, rf: lerp(prof[q][1], prof[q + 1][1], e) * k, rb: lerp(prof[q][2], prof[q + 1][2], e) * k });
  }
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)].p, p1 = pts[Math.min(N, i + 1)].p;
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx; // left normal (screen)
    const frontIsLeft = nx * fwd >= 0, strength = clamp(Math.abs(fwd) * 1.6);
    const { rf, rb } = pts[i], avg = (rf + rb) / 2;
    const rl = lerp(avg, frontIsLeft ? rf : rb, strength), rr = lerp(avg, frontIsLeft ? rb : rf, strength);
    L.push([pts[i].p[0] + nx * rl, pts[i].p[1] + ny * rl]); R.push([pts[i].p[0] - nx * rr, pts[i].p[1] - ny * rr]);
    if (i === 0 || i === N) pts[i].t = [tx, ty];
  }
  const e0 = pts[N], s0 = pts[0];
  const endR = (e0.rf + e0.rb) / 2, startR = (s0.rf + s0.rb) / 2;
  const outline = [...L, [e0.p[0] + e0.t[0] * endR * 0.9, e0.p[1] + e0.t[1] * endR * 0.9], ...R.reverse(), [s0.p[0] - s0.t[0] * startR * 0.9, s0.p[1] - s0.t[1] * startR * 0.9]];
  smooth(ctx, outline);
}

// outline-then-fill for a group of subpaths → one merged silhouette with an outside ink line
function group(ctx, build, fill, lw, stroke = PAL.ink) {
  ctx.beginPath(); build(ctx);
  ctx.strokeStyle = stroke; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
}

// width profiles, metres for a 1.75 m person
const LEG_TROUSER = [[0, 0.074, 0.08], [0.18, 0.068, 0.072], [0.4, 0.055, 0.057], [0.5, 0.05, 0.051], [0.62, 0.047, 0.058], [0.76, 0.044, 0.05], [0.92, 0.041, 0.043], [1, 0.04, 0.041]];
const LEG_BARE = [[0, 0.066, 0.072], [0.2, 0.059, 0.065], [0.42, 0.046, 0.047], [0.5, 0.041, 0.042], [0.62, 0.039, 0.051], [0.78, 0.033, 0.04], [0.93, 0.027, 0.028], [1, 0.026, 0.027]];
const SLEEVE = [[0, 0.05, 0.05], [0.25, 0.047, 0.047], [0.5, 0.041, 0.041], [0.75, 0.039, 0.038], [1, 0.035, 0.034]];

export function drawPerson(ctx, cam, P, st) {
  // st: { x, z, yaw, pose, headYaw (world), headPitch, alpha, expr }
  const pose = st.pose, cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
  const Wp = (p) => [st.x + p[0] * cy - p[2] * sy, p[1], st.z + p[0] * sy + p[2] * cy];
  const S = (p) => { const w = Wp(p); return cam.P(w[0], w[1], w[2]); };
  const k = cam.k(st.z), lw = LW(k, 0.8), s = pose.s;
  if (cam.z - st.z < 0.5) return;
  const R = (m) => m * k;
  const dark = (c, a = 0.1) => tintS(c, -a);
  const fwdScreen = cy; // the body's forward direction along screen x
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (st.alpha != null && st.alpha < 1) ctx.globalAlpha = st.alpha;

  // contact shadows under each foot (they stay put while the foot is planted)
  {
    ctx.save(); ctx.fillStyle = 'rgba(60,62,80,0.2)'; ctx.filter = `blur(${Math.max(1, k * 0.025).toFixed(1)}px)`;
    const a = cam.P(st.x, 0, st.z);
    ctx.beginPath(); ctx.ellipse(a[0] + k * 0.04, a[1] - k * 0.005, k * 0.26, k * 0.05, 0, 0, TAU); ctx.fill();
    for (const side of ['L', 'R']) {
      const an = Wp(pose[`an${side}`]), g = cam.P(an[0], 0, an[2]);
      const lift = clamp(1 - (pose[`an${side}`][1] - 0.085 * s) / (0.2 * s));
      ctx.globalAlpha = (st.alpha ?? 1) * lift * 0.9;
      ctx.beginPath(); ctx.ellipse(g[0] + k * 0.05 * Math.sign(fwdScreen || 1), g[1], k * 0.13, k * 0.035, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  const pel = Wp(pose.pelvis);
  const zOf = (p) => Wp(p)[2] - pel[2];

  const legs = ['L', 'R'].map((side) => ({ side, dz: (zOf(pose[`kn${side}`]) + zOf(pose[`an${side}`])) / 2 })).sort((a, b) => a.dz - b.dz);
  const arms = ['L', 'R'].map((side) => ({ side, dz: zOf(pose[`sh${side}`]) + zOf(pose[`el${side}`]) * 0.2 }));
  const coat = P.top.style === 'coat', skirt = P.bottom.style === 'skirt';

  const drawLeg = (side, far) => {
    const hip = S(pose[`hip${side}`]), kn = S(pose[`kn${side}`]), an = S(pose[`an${side}`]);
    const pc = far ? dark(P.bottom.color, 0.12) : P.bottom.color;
    const legCol = skirt ? (far ? dark(P.legs || P.skin, 0.12) : (P.legs || P.skin)) : pc;
    // shoe, following the foot's pitch and its own yaw
    const fp = pose[`fp${side}`], fy = pose[`fy${side}`] || 0, an3 = pose[`an${side}`];
    const Lf = 0.16 * s, hb = 0.035 * s;
    const heel = S([an3[0] - Math.cos(fy) * hb, an3[1] - 0.05 * s, an3[2] - Math.sin(fy) * hb]);
    const toe = S([an3[0] + Math.cos(fy) * Math.cos(fp) * Lf, an3[1] - 0.055 * s + Math.sin(fp) * Lf, an3[2] + Math.sin(fy) * Math.cos(fp) * Lf]);
    group(ctx, (c) => { capsule(c, heel, toe, R(0.036 * s), R(0.03 * s)); }, far ? dark(P.shoes, 0.1) : P.shoes, lw);
    group(ctx, (c) => limb(c, hip, kn, an, skirt ? LEG_BARE : LEG_TROUSER, R(s * P.build ** 0.5), fwdScreen), legCol, lw);
    if (!skirt && P.bottom.cuff) { ctx.fillStyle = dark(pc, 0.15); ctx.beginPath(); capsule(ctx, [lerp(kn[0], an[0], 0.88), lerp(kn[1], an[1], 0.88)], an, R(0.043 * s), R(0.042 * s)); ctx.fill(); }
  };

  const torsoRings = () => {
    const f = P.fem;
    const rings = [
      [0.0, pose.neckY - 0.03 * s, 0.065, 0.065],
      [-0.005, pose.shY + 0.01 * s, f ? 0.17 : 0.19, 0.1],
      [0.015, pose.shY - 0.13 * s, f ? 0.16 : 0.18, 0.12],
      [0.0, pose.waistY, f ? 0.13 : 0.155, 0.1],
      [-0.005, pose.pelvis[1], f ? 0.175 : 0.165, 0.11],
    ];
    if (coat || skirt) {
      // the hem is pushed by the knees and trails a little behind the body's motion
      const kx = ((pose.knL ? pose.knL[0] : 0) + (pose.knR ? pose.knR[0] : 0)) / 2;
      const spread = pose.knL && pose.knR ? Math.abs(pose.knL[0] - pose.knR[0]) / 2 : 0;
      const trail = -0.018 * (pose.speed || 0);
      const base = coat ? [0.22, 0.19] : [0.23, 0.2];
      rings.push([(kx * 0.45) / s + trail, coat ? pose.hemY : pose.hemY - 0.12 * s, base[0], Math.max(base[1], 0.12 + spread / s * 0.55)]);
    } else rings.push([-0.005, pose.pelvis[1] - 0.06 * s, P.fem ? 0.17 : 0.16, 0.105]);
    return rings;
  };
  const drawTorso = () => {
    const rings = torsoRings();
    const left = [], right = [];
    const lean = pose.lean || 0, px = pose.pelvis[0], py = pose.pelvis[1], sz = pose.pelvis[2];
    for (const [ox, y, a, b] of rings) {
      const bx = px + (y - py) * Math.sin(lean) + ox * s;
      const c = S([bx, y, sz]);
      const e = k * Math.sqrt((b * s * cy) ** 2 + (a * s * P.build * sy) ** 2);
      left.push([c[0] - e, c[1]]); right.push([c[0] + e, c[1]]);
    }
    const pts = [...left, ...right.reverse()];
    // neck
    const nk = S(pose.neck), hd = S([pose.head[0], pose.head[1] - 0.06 * s, pose.head[2]]);
    group(ctx, (c) => capsule(c, nk, hd, R(0.05 * s), R(0.048 * s)), dark(P.skin, 0.06), lw);
    ctx.beginPath(); smooth(ctx, pts); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = P.top.color; ctx.fill();
    if (skirt) {
      const hip = rings[4], hem = rings[5];
      const R4 = S([px + hip[0] * s, hip[1], sz]), R5 = S([px + hem[0] * s, hem[1], sz]);
      const e4 = k * Math.sqrt((hip[3] * s * cy) ** 2 + (hip[2] * s * sy) ** 2), e5 = k * Math.sqrt((hem[3] * s * cy) ** 2 + (hem[2] * s * sy) ** 2);
      ctx.beginPath(); ctx.moveTo(R4[0] - e4, R4[1]); ctx.lineTo(R5[0] - e5, R5[1]); ctx.quadraticCurveTo(R5[0], R5[1] + k * 0.03, R5[0] + e5, R5[1]); ctx.lineTo(R4[0] + e4, R4[1]); ctx.closePath();
      ink(ctx, P.bottom.color, lw);
    }
    // front edge (placket / coat opening)
    if (sy > -0.2) {
      const topP = S([px + (pose.shY - 0.06 * s - py) * Math.sin(lean), pose.shY - 0.06 * s, sz]);
      const frontShift = k * 0.1 * s * cy;
      const bot = S([px, coat ? pose.hemY + 0.02 * s : py - 0.02 * s, sz]);
      ctx.save(); ctx.globalAlpha *= clamp(0.35 + sy * 0.65) * 0.8;
      line(ctx, [[topP[0] + frontShift * 0.85, topP[1]], [bot[0] + frontShift * 0.9, bot[1]]], lw * 0.8, dark(P.top.color, 0.3));
      ctx.restore();
    }
    if (P.scarf) {
      const a = S([pose.neck[0], pose.neckY - 0.07 * s, sz]);
      group(ctx, (c) => { c.ellipse(a[0], a[1], k * Math.sqrt((0.09 * s * cy) ** 2 + (0.12 * s * sy) ** 2), k * 0.055 * s, 0, 0, TAU); }, P.scarf, lw);
      if (sy > -0.3) { const sw = -(pose.bag || 0) * 0.5; const b = S([pose.neck[0] + 0.07 * s + sw * 0.1, pose.neckY - 0.28 * s, sz + 0.04 * s]); group(ctx, (c) => capsule(c, [a[0] + k * 0.03 * s * cy, a[1]], b, R(0.035 * s), R(0.04 * s)), dark(P.scarf, 0.08), lw); }
    } else if (P.top.collar) {
      const a = S([pose.neck[0], pose.neckY - 0.05 * s, sz]);
      ctx.beginPath(); ctx.ellipse(a[0], a[1], k * Math.sqrt((0.08 * s * cy) ** 2 + (0.1 * s * sy) ** 2), k * 0.035 * s, 0, 0, TAU); ink(ctx, P.top.collar, lw * 0.8);
    }
    if (!coat && !skirt) { const b = S([px, py + 0.05 * s, sz]); const e = k * Math.sqrt((0.105 * s * cy) ** 2 + (0.165 * s * P.build * sy) ** 2); ctx.save(); ctx.globalAlpha *= 0.4; line(ctx, [[b[0] - e * 0.95, b[1]], [b[0] + e * 0.95, b[1]]], lw * 0.7, dark(P.top.color, 0.3)); ctx.restore(); }
  };

  const drawArm = (side, far) => {
    const sh = S(pose[`sh${side}`]), el = S(pose[`el${side}`]), wr = S(pose[`wr${side}`]);
    const c = far ? dark(P.top.sleeve || P.top.color, 0.12) : (P.top.sleeve || P.top.color);
    const w0 = pose[`wr${side}`], e0 = pose[`el${side}`];
    const dx = w0[0] - e0[0], dy = w0[1] - e0[1], dl = Math.hypot(dx, dy) || 1;
    const hand = S([w0[0] + dx / dl * 0.06 * s, w0[1] + dy / dl * 0.06 * s, w0[2]]);
    group(ctx, (cc) => { cc.ellipse(hand[0], hand[1], R(0.042 * s), R(0.05 * s), Math.atan2(hand[1] - wr[1], hand[0] - wr[0]) + Math.PI / 2, 0, TAU); }, far ? dark(P.skin, 0.1) : P.skin, lw * 0.9);
    group(ctx, (cc) => limb(cc, sh, el, wr, SLEEVE, R(s * P.build ** 0.5), fwdScreen), c, lw);
    if (P.prop === 'coffee' && side === P.propSide) {
      const hx = hand[0], hy = hand[1] - R(0.03 * s);
      ctx.beginPath(); ctx.moveTo(hx - R(0.04), hy - R(0.07)); ctx.lineTo(hx + R(0.04), hy - R(0.07)); ctx.lineTo(hx + R(0.032), hy + R(0.07)); ctx.lineTo(hx - R(0.032), hy + R(0.07)); ctx.closePath(); ink(ctx, '#F1ECE2', lw * 0.8);
      ctx.beginPath(); ctx.rect(hx - R(0.045), hy - R(0.085), R(0.09), R(0.022)); ink(ctx, '#3B3A3A', lw * 0.6);
      ctx.beginPath(); ctx.rect(hx - R(0.036), hy - R(0.02), R(0.072), R(0.05)); ink(ctx, '#B98C63', 0);
    }
    if (P.prop === 'phone' && side === 'R') {
      const lp = pose.lookPhone || 0;
      const hx = hand[0] + R(0.01) * Math.sign(cy || 1), hy = hand[1] - R(0.02);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.2 * Math.sign(cy || 1) * (1 - lp));
      rrectPath(ctx, -R(0.03), -R(0.07), R(0.06), R(0.13), R(0.01)); ink(ctx, '#2D2F35', lw * 0.6);
      if (lp > 0.2 && sy > -0.9) { ctx.fillStyle = `rgba(200,225,255,${0.6 * lp})`; ctx.fillRect(-R(0.02), -R(0.06), R(0.04), R(0.1)); }
      ctx.restore();
    }
    if (P.prop === 'bagHand' && side === P.propSide) {
      // the bag hangs from the hand and swings as a pendulum
      ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(-(pose.hbag || 0) * Math.sign(cy || 1) * Math.min(1, Math.abs(cy) * 1.5));
      ctx.beginPath(); ctx.moveTo(-R(0.05), R(0.02)); ctx.lineTo(0, -R(0.03)); ctx.lineTo(R(0.05), R(0.02)); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw; ctx.stroke();
      const bw = R(0.13 * (0.6 + 0.4 * Math.abs(sy))) + R(0.06), bh = R(0.26);
      ctx.beginPath(); ctx.rect(-bw, R(0.02), bw * 2, bh); ink(ctx, P.bagColor || '#C7AA83', lw * 0.9);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(-bw, R(0.02), bw * 2, R(0.03));
      if (P.bagMark) { ctx.fillStyle = P.bagMark; ctx.fillRect(-bw * 0.35, bh * 0.5, bw * 0.7, R(0.02)); }
      ctx.restore();
    }
  };

  const drawBag = () => {
    if (!P.bag) return;
    const side = P.bag.side || 'L';
    const sh3 = pose[`sh${side}`], sh = S(sh3);
    const th = pose.bag || 0; // pendulum angle, + forward
    if (P.bag.type === 'tote') {
      const hp = S([sh3[0] + Math.sin(th) * 0.5 * s - 0.02 * s, sh3[1] - Math.cos(th) * 0.5 * s, sh3[2] * 1.2]);
      const bw = k * 0.17 * s * (0.55 + 0.45 * Math.abs(cy)), bh = k * 0.32 * s;
      line(ctx, [sh, [hp[0] - bw * 0.5, hp[1] - bh * 0.5]], lw * 0.9, dark(P.bag.color, 0.25));
      line(ctx, [sh, [hp[0] + bw * 0.5, hp[1] - bh * 0.5]], lw * 0.9, dark(P.bag.color, 0.25));
      ctx.beginPath(); ctx.moveTo(hp[0] - bw, hp[1] - bh * 0.45); ctx.lineTo(hp[0] + bw, hp[1] - bh * 0.45); ctx.lineTo(hp[0] + bw * 0.92, hp[1] + bh * 0.55); ctx.lineTo(hp[0] - bw * 0.92, hp[1] + bh * 0.55); ctx.closePath();
      ink(ctx, P.bag.color, lw);
    } else if (P.bag.type === 'backpack') {
      const c = S([pose.pelvis[0] - 0.17 * s, 1.18 * s + (pose.dy || 0), pose.pelvis[2]]);
      const e = k * Math.sqrt((0.08 * s * cy) ** 2 + (0.15 * s * sy) ** 2) + k * 0.02;
      rrectPath(ctx, c[0] - e, c[1] - k * 0.22 * s, e * 2, k * 0.42 * s, k * 0.06 * s); ink(ctx, P.bag.color, lw);
    } else if (P.bag.type === 'cross') {
      const hp = S([pose.pelvis[0] + 0.02 * s + Math.sin(th) * 0.12 * s, pose.pelvis[1] + 0.1 * s, pose.hipL[2] * 1.3]);
      const other = S(pose[side === 'L' ? 'shR' : 'shL']);
      line(ctx, [other, hp], lw * 0.9, dark(P.bag.color, 0.2));
      ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(-th * 0.5 * Math.sign(cy || 1));
      rrectPath(ctx, -k * 0.1 * s, -k * 0.07 * s, k * 0.2 * s, k * 0.15 * s, k * 0.03 * s); ink(ctx, P.bag.color, lw); ctx.restore();
    }
  };

  const drawHead = () => {
    const hc = S(pose.head); const Rh = k * 0.104 * s;
    const hy = st.headYaw ?? st.yaw; const fx = Math.cos(hy), fz = Math.sin(hy);
    const pitch = (st.headPitch || 0) + (pose.lookPhone || 0) * 0.35;
    const cxh = hc[0], cyh = hc[1] + pitch * Rh * 0.25;
    const hs = P.hair.style, hcCol = P.hair.color, skinSh = dark(P.skin, 0.12);
    const backZ = -fz; // > 0: the back of the head faces the camera
    const knot = (front) => {
      if (hs === 'bun' && (backZ > 0.15) === front) { const bx = cxh + Rh * 0.78 * Math.cos(hy + Math.PI); ell(ctx, bx, cyh - Rh * 0.72, Rh * 0.4, Rh * 0.38, hcCol, lw); }
      if (hs === 'pony' && (backZ > 0.15) === front) {
        const bx = cxh + Rh * 0.9 * Math.cos(hy + Math.PI), sw = -(pose.pony || 0) * Math.sign(fx || 1) * 1.1 - fx * 0.04 * (pose.speed || 0);
        ctx.beginPath(); ctx.moveTo(bx - Rh * 0.16, cyh - Rh * 0.45); ctx.quadraticCurveTo(bx - fx * Rh * 0.45 + sw * Rh, cyh + Rh * 0.6, bx - fx * Rh * 0.2 + sw * Rh * 1.5, cyh + Rh * 1.35);
        ctx.quadraticCurveTo(bx + fx * Rh * 0.1 + Rh * 0.12, cyh + Rh * 0.5, bx + Rh * 0.16, cyh - Rh * 0.45); ctx.closePath(); ink(ctx, hcCol, lw);
        ell(ctx, bx, cyh - Rh * 0.42, Rh * 0.12, Rh * 0.1, dark(hcCol, 0.2), 0);
      }
    };
    // long hair falls behind the head and shoulders
    if (hs === 'long' || hs === 'bob') {
      const L = hs === 'long' ? 1.75 : 1.0;
      const bx = cxh - fx * Rh * 0.28 * (1 - Math.max(0, fz)) - Math.sign(fx || 1) * (pose.pony || 0) * Rh * 0.25;
      const wv = Rh * (1.05 + 0.1 * Math.abs(fz));
      ctx.beginPath(); rrectPath(ctx, bx - wv, cyh - Rh * 0.55, wv * 2, Rh * (0.55 + L), Rh * 0.6); ink(ctx, dark(hcCol, 0.06), lw);
    }
    knot(false);
    // skull in hair colour; the face region in skin
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cxh, cyh, Rh * 0.92, Rh * 1.1, 0, 0, TAU);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 2; ctx.stroke();
    const short = hs === 'bald' || hs === 'crop';
    ctx.fillStyle = hs === 'bald' ? P.skin : hcCol; ctx.fill();
    ctx.clip();
    const v = clamp((fz + 0.4) / 0.65);
    if (v > 0) {
      const fcx = cxh + fx * Rh * 0.42 * (1 - 0.5 * Math.max(0, fz)), fcy = cyh + Rh * (short ? 0.12 : 0.24);
      ctx.beginPath(); ctx.ellipse(fcx, fcy, Rh * (0.56 + 0.26 * Math.max(0, fz)) * (0.35 + 0.65 * v), Rh * (short ? 0.95 : 0.84), 0, 0, TAU);
      ctx.fillStyle = P.skin; ctx.fill();
      // hairline
      if (hs !== 'bald') { ctx.fillStyle = hcCol; ctx.beginPath(); ctx.ellipse(cxh - fx * Rh * 0.18, cyh - Rh * (short ? 0.98 : 0.8), Rh * 1.08, Rh * (short ? 0.4 : 0.44), fx * 0.22, 0, TAU); ctx.fill(); }
    } else if (short) {
      // very short hair from behind: a hint of skin at the nape
      ctx.fillStyle = P.skin; ctx.beginPath(); ctx.ellipse(cxh, cyh + Rh * 1.05, Rh * 0.6, Rh * 0.3, 0, 0, TAU); ctx.fill();
    }
    if (hs === 'bald') { ctx.globalAlpha *= 0.35; ctx.fillStyle = skinSh; ctx.beginPath(); ctx.ellipse(cxh - fx * Rh * 0.5, cyh + Rh * 0.3, Rh * 0.6, Rh * 0.35, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    // the ear toward the camera
    if (hs !== 'long' && hs !== 'bob') for (const b of [Math.PI / 2, -Math.PI / 2]) {
      const zz = Math.sin(hy + b); if (zz < 0.45) continue;
      const ex = cxh + Rh * 0.86 * Math.cos(hy + b) - fx * Rh * 0.04;
      ell(ctx, ex, cyh + Rh * 0.12, Rh * 0.12 * (0.5 + 0.5 * zz), Rh * 0.19, skinSh, lw * 0.7);
    }
    // nose
    if (fz > -0.25) {
      const nx = cxh + fx * Rh * 0.9, ny = cyh + Rh * 0.14;
      if (Math.abs(fx) > 0.4) {
        ctx.beginPath(); ctx.moveTo(nx - fx * Rh * 0.1, ny - Rh * 0.32); ctx.quadraticCurveTo(nx + fx * Rh * 0.22, ny + Rh * 0.1, nx - fx * Rh * 0.02, ny + Rh * 0.17); ctx.lineTo(nx - fx * Rh * 0.16, ny + Rh * 0.12); ctx.closePath();
        ctx.fillStyle = P.skin; ctx.fill();
        ctx.beginPath(); ctx.moveTo(nx - fx * Rh * 0.08, ny - Rh * 0.3); ctx.quadraticCurveTo(nx + fx * Rh * 0.22, ny + Rh * 0.1, nx - fx * Rh * 0.04, ny + Rh * 0.17); ink(ctx, null, lw * 0.75);
      } else {
        line(ctx, [[cxh + fx * Rh * 0.55, cyh + Rh * 0.02], [cxh + fx * Rh * 0.55 + Rh * 0.05, cyh + Rh * 0.24]], lw * 0.7, dark(P.skin, 0.35));
      }
    }
    // eyes + brows
    if (fz > -0.2) for (const b of [0.52, -0.52]) {
      const zz = Math.sin(hy + b); if (zz < 0.12) continue;
      const ex = cxh + Rh * 0.74 * Math.cos(hy + b), ey = cyh + Rh * 0.02;
      if (st.blink) line(ctx, [[ex - Rh * 0.06, ey], [ex + Rh * 0.06, ey]], lw * 0.7, '#2A2626');
      else { ctx.fillStyle = '#2A2626'; ctx.beginPath(); ctx.ellipse(ex, ey, Rh * 0.055 * (0.55 + 0.45 * zz), Rh * 0.075, 0, 0, TAU); ctx.fill(); }
      const br = (st.expr?.brow || 0);
      line(ctx, [[ex - Rh * 0.1 * zz, ey - Rh * (0.2 + br * 0.08)], [ex + Rh * 0.09 * zz, ey - Rh * (0.23 + br * 0.1)]], lw * 0.65, dark(hcCol === '#CFCBC6' ? '#8A8580' : hcCol, 0.05));
    }
    // mouth
    if (fz > -0.15) {
      const sm = st.expr?.smile || 0;
      const mx = cxh + fx * Rh * 0.62, my = cyh + Rh * 0.47;
      const w = Rh * (0.1 + 0.12 * Math.max(0, fz));
      ctx.beginPath(); ctx.moveTo(mx - w, my - sm * Rh * 0.05); ctx.quadraticCurveTo(mx, my + Rh * (0.02 + sm * 0.12), mx + w, my - sm * Rh * 0.05);
      ctx.strokeStyle = dark(P.skin, 0.45); ctx.lineWidth = lw * 0.7; ctx.lineCap = 'round'; ctx.stroke();
    }
    knot(true);
    // hats
    if (P.hat === 'beanie') { ctx.beginPath(); ctx.ellipse(cxh, cyh - Rh * 0.32, Rh * 0.98, Rh * 0.8, 0, Math.PI, TAU); ctx.lineTo(cxh + Rh * 0.98, cyh - Rh * 0.2); ctx.lineTo(cxh - Rh * 0.98, cyh - Rh * 0.2); ctx.closePath(); ink(ctx, P.hatColor, lw); line(ctx, [[cxh - Rh * 0.95, cyh - Rh * 0.36], [cxh + Rh * 0.95, cyh - Rh * 0.36]], lw * 0.6, dark(P.hatColor, 0.2)); }
    if (P.hat === 'cap') { ctx.beginPath(); ctx.ellipse(cxh, cyh - Rh * 0.38, Rh * 0.96, Rh * 0.72, 0, Math.PI, TAU); ctx.closePath(); ink(ctx, P.hatColor, lw); if (fz > -0.6) { const bx = cxh + fx * Rh * 0.78; ctx.beginPath(); ctx.ellipse(bx, cyh - Rh * 0.4, Rh * (0.2 + 0.42 * Math.abs(fx)), Rh * 0.1, 0, 0, TAU); ink(ctx, dark(P.hatColor, 0.12), lw * 0.8); } }
  };

  // ---- paint in depth order
  const farArm = arms.filter((a) => a.dz < -0.02 * s).map((a) => a.side);
  const nearArm = arms.filter((a) => a.dz >= -0.02 * s).map((a) => a.side);
  if (P.bag && P.bag.type === 'backpack' && sy > 0.2) drawBag();
  for (const a of farArm) drawArm(a, true);
  if (P.bag && P.bag.type === 'tote' && zOf(pose[`sh${P.bag.side || 'L'}`]) < 0) drawBag();
  for (const l of legs) drawLeg(l.side, l.dz < -0.01);
  drawTorso();
  if (P.bag && (P.bag.type === 'backpack' ? sy <= 0.2 : P.bag.type === 'cross' || zOf(pose[`sh${P.bag.side || 'L'}`]) >= 0)) drawBag();
  nearArm.sort((a, b) => zOf(pose[`el${a}`]) - zOf(pose[`el${b}`]));
  drawHead();
  for (const a of nearArm) drawArm(a, false);
  ctx.restore();
}
