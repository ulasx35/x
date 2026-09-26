// People: a 2.5D puppet. Joints live in 3D body space (x forward, y up, z to the body's left), are placed in
// the street with a yaw, projected by the street camera and drawn as clean outlined shapes.
// Feet are solved from planted footfall positions, so they never slide.
import { W, H, TAU, clamp, lerp, sstep, easeIO, noise1, hex, rgb, mix, tintS, PAL, poly, smooth, ink, line, ell, rrectPath } from './core.js';
import { LW } from './street.js';

const frac = (x) => x - Math.floor(x);

// ------------------------------------------------------------------ gait
export const GAIT = { duty: 0.6, R0: 0.34, R1: 0.5 }; // reach ahead / behind the pelvis (for 1.75 m)
export const stride = (P) => (GAIT.R0 + GAIT.R1) / GAIT.duty * (P.h / 1.75);

function ik2(hip, target, l1, l2) {
  // sagittal two-bone IK (x forward, y up), knee bends forward
  let dx = target[0] - hip[0], dy = target[1] - hip[1];
  let d = Math.hypot(dx, dy); const maxd = (l1 + l2) * 0.999;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  const a = Math.atan2(dy, dx);
  const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const b = Math.acos(c);
  const ka = a + b; // knee forward (for a leg pointing down, +b rotates toward +x)
  const knee = [hip[0] + Math.cos(ka) * l1, hip[1] + Math.sin(ka) * l1];
  return { knee, ankle: [hip[0] + dx, hip[1] + dy] };
}

// A pose is a dictionary of body-space points [x, y, z] plus a few angles.
function basePose(P) {
  const s = P.h / 1.75;
  return {
    s, hipH: 0.905 * s, hw: 0.095 * s * P.build, sw: 0.158 * s * P.build * (P.fem ? 0.92 : 1),
    shY: 1.43 * s, neckY: 1.5 * s, headY: 1.635 * s, thigh: 0.44 * s, shin: 0.43 * s, ankleH: 0.085 * s,
    upper: 0.3 * s, fore: 0.27 * s,
  };
}

function armFrom(pose, side, ang, flex, spread = 0.06, twist = 0) {
  // arm hanging from the shoulder: ang = swing forward (rad), flex = elbow bend
  const { s } = pose, sh = pose[`sh${side}`];
  const sz = side === 'L' ? 1 : -1;
  const el = [sh[0] + Math.sin(ang) * pose.upper, sh[1] - Math.cos(ang) * pose.upper, sh[2] + sz * spread * s];
  const a2 = ang + flex;
  const wr = [el[0] + Math.sin(a2) * pose.fore, el[1] - Math.cos(a2) * pose.fore, el[2] + sz * (spread * 0.6 + twist) * s];
  pose[`el${side}`] = el; pose[`wr${side}`] = wr;
}

function placeTorso(pose, lean, pelvisY, pelvisX = 0, sway = 0) {
  const { s } = pose;
  pose.lean = lean;
  const L = (y) => pelvisX + (y - pelvisY) * Math.sin(lean);
  pose.pelvis = [pelvisX, pelvisY, sway];
  pose.shL = [L(pose.shY) - 0.01 * s, pose.shY, pose.sw + sway];
  pose.shR = [L(pose.shY) - 0.01 * s, pose.shY, -pose.sw + sway];
  pose.neck = [L(pose.neckY), pose.neckY, sway];
  pose.head = [L(pose.headY) + 0.01 * s, pose.headY, sway];
  pose.hipL = [pelvisX, pelvisY, pose.hw + sway];
  pose.hipR = [pelvisX, pelvisY, -pose.hw + sway];
}

// arms for held props / gestures; returns true if the arm was set
function propArms(pose, P, which, t, walkAng = 0) {
  const s = pose.s;
  if (P.prop === 'coffee' && which === P.propSide) { armFrom(pose, which, 0.22 + walkAng * 0.15, 1.45, 0.05); return true; }
  if (P.prop === 'phone' && pose.lookPhone > 0.01) {
    const f = pose.lookPhone;
    if (which === 'R') { armFrom(pose, 'R', lerp(walkAng, 0.3, f), lerp(0.3, 1.55, f), lerp(0.06, 0.02, f), lerp(0, 0.08, f)); return true; }
    if (which === 'L' && f > 0.5 && P.twoHands) { armFrom(pose, 'L', 0.25, 1.5, 0.02, -0.1); return true; }
  }
  if (P.prop === 'phone' && which === 'R') { armFrom(pose, 'R', walkAng * 0.6, 0.3, 0.07); return true; }
  if (P.prop === 'bagHand' && which === P.propSide) { armFrom(pose, which, walkAng * 0.35, 0.12, 0.1); return true; }
  if (pose.pocket && which === pose.pocket) { armFrom(pose, which, -0.05, 0.55, 0.13); return true; }
  return false;
}

export function walkPose(P, phase, t, opts = {}) {
  const pose = basePose(P), s = pose.s;
  const scale = opts.strideScale ?? 1;
  const R0 = GAIT.R0 * s * scale, R1 = GAIT.R1 * s * scale, D = GAIT.duty;
  const bob = 0.022 * s * scale;
  const pelvisY = pose.hipH - bob * (1 - Math.cos(TAU * 2 * (phase - 0.3))) / 2 - 0.01 * s;
  placeTorso(pose, 0.045 * scale + (opts.lean || 0), pelvisY, 0, 0);
  for (const [side, off] of [['R', 0], ['L', 0.5]]) {
    const u = frac(phase + off);
    let fx, fy, pitch;
    if (u < D) {
      const w = u / D;
      fx = R0 - w * (R0 + R1);
      const rise = sstep(0.62, 1, w);
      fy = pose.ankleH + rise * 0.1 * s * scale;
      pitch = u < 0.08 ? lerp(0.22, 0, u / 0.08) : -rise * 0.55;
    } else {
      const w = (u - D) / (1 - D);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * w);
      fx = -R1 + e * (R0 + R1);
      fy = pose.ankleH + (0.1 * s * scale) * (1 - w) * (1 - w) * (w < 0.3 ? 1 : 1) + Math.sin(Math.PI * Math.min(1, w * 1.15)) * 0.07 * s * scale;
      pitch = w < 0.5 ? lerp(-0.6, 0, w / 0.5) : lerp(0, 0.24, (w - 0.5) / 0.5);
    }
    const hip = pose[`hip${side}`];
    const { knee, ankle } = ik2([hip[0], hip[1]], [fx, fy], pose.thigh, pose.shin);
    const z = hip[2] * 0.92;
    pose[`kn${side}`] = [knee[0], knee[1], z]; pose[`an${side}`] = [ankle[0], ankle[1], z]; pose[`fp${side}`] = pitch;
  }
  // arms swing against the legs
  const A = 0.34 * scale;
  for (const side of ['R', 'L']) {
    const u = frac(phase + (side === 'R' ? 0 : 0.5));
    const ang = -A * Math.cos(TAU * u);
    pose.lookPhone = opts.lookPhone || 0;
    if (!propArms(pose, P, side, t, ang)) armFrom(pose, side, ang, 0.22 + 0.25 * Math.max(0, ang / A), 0.06);
  }
  return pose;
}

export function standPose(P, t, opts = {}) {
  const pose = basePose(P), s = pose.s;
  const sway = Math.sin(t * 0.7 + P.seed) * 0.008 * s;
  const breath = Math.sin(t * 1.7 + P.seed * 2) * 0.004 * s;
  const pelvisY = pose.hipH - 0.012 * s;
  placeTorso(pose, 0.01 + (opts.lean || 0), pelvisY, sway * 0.5, sway);
  pose.shL[1] += breath; pose.shR[1] += breath;
  const stance = opts.stance ?? 0.05;
  for (const [side, dx] of [['R', stance], ['L', -stance * 0.6]]) {
    const hip = pose[`hip${side}`];
    const target = [dx * s, pose.ankleH];
    const { knee, ankle } = ik2([hip[0], hip[1]], target, pose.thigh, pose.shin);
    const z = hip[2] * 1.05 - sway * 0.5;
    pose[`kn${side}`] = [knee[0], knee[1], z]; pose[`an${side}`] = [ankle[0], ankle[1], z]; pose[`fp${side}`] = 0;
  }
  pose.lookPhone = opts.lookPhone || 0; pose.pocket = opts.pocket || null;
  for (const side of ['R', 'L']) if (!propArms(pose, P, side, t, 0)) armFrom(pose, side, 0.04, 0.16, 0.07);
  return pose;
}

export function seatedPose(P, t, opts = {}) {
  const pose = basePose(P), s = pose.s;
  const seatY = 0.47;
  const pelvisY = seatY + 0.07 * s;
  placeTorso(pose, -0.04, pelvisY, 0, 0);
  for (const [side, dz] of [['R', 0], ['L', 0.02]]) {
    const hip = pose[`hip${side}`];
    const knee = [hip[0] + pose.thigh * 0.98, pelvisY + 0.02 * s];
    const ankle = [knee[0] + 0.06 * s, pose.ankleH];
    const z = hip[2] + dz;
    pose[`kn${side}`] = [knee[0], knee[1], z]; pose[`an${side}`] = [ankle[0], ankle[1], z]; pose[`fp${side}`] = 0;
  }
  pose.lookPhone = 0;
  // one hand on the table, the other lifting a cup now and then
  const sip = opts.sip || 0;
  armFrom(pose, 'L', 0.9, 0.6, 0.06);
  armFrom(pose, 'R', lerp(0.75, 0.35, sip), lerp(0.6, 2.0, sip), 0.04);
  return pose;
}

// after blending two poses, re-solve the knees so the legs keep their true length
export function resolveLegs(pose) {
  for (const side of ['L', 'R']) {
    const hip = pose[`hip${side}`], an = pose[`an${side}`];
    const { knee, ankle } = ik2([hip[0], hip[1]], [an[0], an[1]], pose.thigh, pose.shin);
    pose[`kn${side}`] = [knee[0], knee[1], pose[`kn${side}`][2]];
    pose[`an${side}`] = [ankle[0], ankle[1], an[2]];
  }
  return pose;
}

export function blendPose(a, b, w) {
  if (w <= 0) return a; if (w >= 1) return b;
  const out = { ...a };
  for (const k of Object.keys(a)) {
    const va = a[k], vb = b[k];
    if (Array.isArray(va) && Array.isArray(vb)) out[k] = [lerp(va[0], vb[0], w), lerp(va[1], vb[1], w), lerp(va[2], vb[2], w)];
    else if (typeof va === 'number' && typeof vb === 'number') out[k] = lerp(va, vb, w);
  }
  return out;
}

// ------------------------------------------------------------------ drawing
function capsule(ctx, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / d, ny = dx / d, ang = Math.atan2(dy, dx);
  const sa = Math.asin(clamp((ra - rb) / d, -1, 1));
  ctx.moveTo(a[0] + nx * ra, a[1] + ny * ra);
  ctx.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  ctx.arc(b[0], b[1], rb, ang + Math.PI / 2 - sa * 0, ang - Math.PI / 2 + sa * 0, true);
  ctx.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  ctx.arc(a[0], a[1], ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
}

// outline-then-fill for a group of subpaths → one merged silhouette with an outside ink line
function group(ctx, build, fill, lw, stroke = PAL.ink) {
  ctx.beginPath(); build(ctx);
  ctx.strokeStyle = stroke; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
}

export function drawPerson(ctx, cam, P, st) {
  // st: { x, z, yaw, pose, headYaw (world), headPitch, alpha, expr }
  const pose = st.pose, cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
  const Wp = (p) => [st.x + p[0] * cy - p[2] * sy, p[1], st.z + p[0] * sy + p[2] * cy];
  const S = (p) => { const w = Wp(p); return cam.P(w[0], w[1], w[2]); };
  const k = cam.k(st.z), lw = LW(k, 0.8), s = pose.s;
  if (cam.z - st.z < 0.5) return;
  const R = (m) => m * k;
  const dark = (c, a = 0.1) => tintS(c, -a);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (st.alpha != null && st.alpha < 1) ctx.globalAlpha = st.alpha;

  // contact shadow
  {
    const a = cam.P(st.x, 0, st.z);
    ctx.save(); ctx.fillStyle = 'rgba(60,62,80,0.22)'; ctx.filter = `blur(${Math.max(1, k * 0.03).toFixed(1)}px)`;
    ctx.beginPath(); ctx.ellipse(a[0] + k * 0.05, a[1] - k * 0.01, k * 0.34, k * 0.07, 0, 0, TAU); ctx.fill(); ctx.restore();
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
    // shoe
    const fp = pose[`fp${side}`], an3 = pose[`an${side}`];
    const heel = S([an3[0] - 0.035 * s, an3[1] - 0.05 * s, an3[2]]);
    const toe = S([an3[0] + Math.cos(fp) * 0.16 * s, an3[1] - 0.055 * s + Math.sin(fp) * 0.16 * s, an3[2]]);
    group(ctx, (c) => { capsule(c, heel, toe, R(0.036 * s), R(0.03 * s)); }, far ? dark(P.shoes, 0.1) : P.shoes, lw);
    group(ctx, (c) => {
      capsule(c, hip, kn, R(0.075 * s * P.build), R(0.056 * s));
      capsule(c, kn, an, R(0.055 * s), R(0.042 * s));
    }, legCol, lw);
    if (!skirt && P.bottom.cuff) { ctx.fillStyle = dark(pc, 0.15); ctx.beginPath(); capsule(ctx, [lerp(kn[0], an[0], 0.88), lerp(kn[1], an[1], 0.88)], an, R(0.045 * s), R(0.044 * s)); ctx.fill(); }
  };

  const torsoRings = () => {
    const f = P.fem;
    const rings = [
      [0.0, pose.neckY - 0.03 * s, 0.065, 0.065],
      [-0.005, pose.shY + 0.01 * s, f ? 0.17 : 0.19, 0.1],
      [0.015, pose.shY - 0.13 * s, f ? 0.16 : 0.18, 0.12],
      [0.0, 1.08 * s, f ? 0.13 : 0.155, 0.1],
      [-0.005, pose.pelvis[1] - 0.0, f ? 0.175 : 0.165, 0.11],
    ];
    if (coat) rings.push([0.01, 0.62 * s, 0.22, 0.19]);
    else if (skirt) rings.push([0.02, 0.5 * s, 0.23, 0.2]);
    else rings.push([-0.005, pose.pelvis[1] - 0.06 * s, f ? 0.17 : 0.16, 0.105]);
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
      // forward offset makes the chest/back asymmetric in profile
      left.push([c[0] - e, c[1]]); right.push([c[0] + e, c[1]]);
    }
    const pts = [...left, ...right.reverse()];
    // neck
    const nk = S(pose.neck), hd = S([pose.head[0], pose.head[1] - 0.06 * s, pose.head[2]]);
    group(ctx, (c) => capsule(c, nk, hd, R(0.05 * s), R(0.048 * s)), dark(P.skin, 0.06), lw);
    // skirt/coat lower body as a separate softer piece
    ctx.beginPath(); smooth(ctx, pts); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = P.top.color; ctx.fill();
    if (skirt) {
      const hip = rings[4], hem = rings[5];
      const i4 = 4; const pts2 = [left[i4], left[5], right[right.length - 1 - 5] || right[0], right[right.length - 1 - 4]];
      const R4 = S([px + hip[0] * s, hip[1], sz]), R5 = S([px + hem[0] * s, hem[1], sz]);
      const e4 = k * Math.sqrt((hip[3] * s * cy) ** 2 + (hip[2] * s * sy) ** 2), e5 = k * Math.sqrt((hem[3] * s * cy) ** 2 + (hem[2] * s * sy) ** 2);
      ctx.beginPath(); ctx.moveTo(R4[0] - e4, R4[1]); ctx.lineTo(R5[0] - e5, R5[1]); ctx.quadraticCurveTo(R5[0], R5[1] + k * 0.03, R5[0] + e5, R5[1]); ctx.lineTo(R4[0] + e4, R4[1]); ctx.closePath();
      ink(ctx, P.bottom.color, lw);
    }
    // front details: placket / coat opening visible when facing the camera or in profile
    const facing = sy; // +1 = toward camera
    if (facing > -0.2) {
      const cxf = px + 0.12 * s * cy * 0 ;
      const topP = S([px + (pose.shY - 0.06 * s - py) * Math.sin(lean) + 0.1 * s * Math.max(0, Math.abs(cy)) * 0, pose.shY - 0.06 * s, sz]);
      const frontShift = k * 0.1 * s * cy; // in profile the front edge sits on the silhouette
      const bot = S([px, coat ? 0.64 * s : py - 0.02 * s, sz]);
      ctx.save(); ctx.globalAlpha *= clamp(0.35 + facing * 0.65) * 0.8;
      line(ctx, [[topP[0] + frontShift * 0.85, topP[1]], [bot[0] + frontShift * 0.9, bot[1]]], lw * 0.8, dark(P.top.color, 0.3));
      ctx.restore();
    }
    // collar / scarf
    if (P.scarf) {
      const a = S([pose.neck[0], pose.neckY - 0.07 * s, sz]);
      group(ctx, (c) => { c.ellipse(a[0], a[1], k * Math.sqrt((0.09 * s * cy) ** 2 + (0.12 * s * sy) ** 2), k * 0.055 * s, 0, 0, TAU); }, P.scarf, lw);
      if (sy > -0.3) { const b = S([pose.neck[0] + 0.07 * s, pose.neckY - 0.28 * s, sz + 0.04 * s]); group(ctx, (c) => capsule(c, [a[0] + k * 0.03 * s * cy, a[1]], b, R(0.035 * s), R(0.04 * s)), dark(P.scarf, 0.08), lw); }
    } else if (P.top.collar) {
      const a = S([pose.neck[0], pose.neckY - 0.05 * s, sz]);
      ctx.beginPath(); ctx.ellipse(a[0], a[1], k * Math.sqrt((0.08 * s * cy) ** 2 + (0.1 * s * sy) ** 2), k * 0.035 * s, 0, 0, TAU); ink(ctx, P.top.collar, lw * 0.8);
    }
    // belt line
    if (!coat && !skirt) { const b = S([px, py + 0.05 * s, sz]); const e = k * Math.sqrt((0.105 * s * cy) ** 2 + (0.165 * s * P.build * sy) ** 2); ctx.save(); ctx.globalAlpha *= 0.4; line(ctx, [[b[0] - e * 0.95, b[1]], [b[0] + e * 0.95, b[1]]], lw * 0.7, dark(P.top.color, 0.3)); ctx.restore(); }
  };

  const drawArm = (side, far) => {
    const sh = S(pose[`sh${side}`]), el = S(pose[`el${side}`]), wr = S(pose[`wr${side}`]);
    const c = far ? dark(P.top.sleeve || P.top.color, 0.12) : (P.top.sleeve || P.top.color);
    const w0 = pose[`wr${side}`], e0 = pose[`el${side}`];
    const dx = w0[0] - e0[0], dy = w0[1] - e0[1], dl = Math.hypot(dx, dy) || 1;
    const hand = S([w0[0] + dx / dl * 0.06 * s, w0[1] + dy / dl * 0.06 * s, w0[2]]);
    group(ctx, (cc) => { cc.ellipse(hand[0], hand[1], R(0.042 * s), R(0.05 * s), Math.atan2(hand[1] - wr[1], hand[0] - wr[0]) + Math.PI / 2, 0, TAU); }, far ? dark(P.skin, 0.1) : P.skin, lw * 0.9);
    group(ctx, (cc) => { capsule(cc, sh, el, R(0.05 * s * P.build), R(0.043 * s)); capsule(cc, el, wr, R(0.042 * s), R(0.036 * s)); }, c, lw);
    // held props
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
      const hx = hand[0], hy = hand[1];
      ctx.beginPath(); ctx.moveTo(hx - R(0.05), hy + R(0.02)); ctx.lineTo(hx, hy - R(0.03)); ctx.lineTo(hx + R(0.05), hy + R(0.02)); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw; ctx.stroke();
      const bw = R(0.13 * (0.6 + 0.4 * Math.abs(sy))) + R(0.06), bh = R(0.26);
      ctx.beginPath(); ctx.rect(hx - bw, hy + R(0.02), bw * 2, bh); ink(ctx, P.bagColor || '#C7AA83', lw * 0.9);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(hx - bw, hy + R(0.02), bw * 2, R(0.03));
      if (P.bagMark) { ctx.fillStyle = P.bagMark; ctx.fillRect(hx - bw * 0.35, hy + bh * 0.5, bw * 0.7, R(0.02)); }
    }
  };

  const drawBag = () => {
    if (!P.bag) return;
    const side = P.bag.side || 'L';
    const sh = S(pose[`sh${side}`]);
    if (P.bag.type === 'tote') {
      const hp = S([pose.pelvis[0] - 0.02 * s, pose.pelvis[1] + 0.05 * s, pose[`sh${side}`][2] * 1.2]);
      const bw = k * 0.17 * s * (0.55 + 0.45 * Math.abs(cy)), bh = k * 0.32 * s;
      line(ctx, [sh, [hp[0] - bw * 0.5, hp[1] - bh * 0.5]], lw * 0.9, dark(P.bag.color, 0.25));
      line(ctx, [sh, [hp[0] + bw * 0.5, hp[1] - bh * 0.5]], lw * 0.9, dark(P.bag.color, 0.25));
      ctx.beginPath(); ctx.moveTo(hp[0] - bw, hp[1] - bh * 0.45); ctx.lineTo(hp[0] + bw, hp[1] - bh * 0.45); ctx.lineTo(hp[0] + bw * 0.92, hp[1] + bh * 0.55); ctx.lineTo(hp[0] - bw * 0.92, hp[1] + bh * 0.55); ctx.closePath();
      ink(ctx, P.bag.color, lw);
    } else if (P.bag.type === 'backpack') {
      const c = S([pose.pelvis[0] - 0.17 * s, 1.18 * s, pose.pelvis[2]]);
      const e = k * Math.sqrt((0.08 * s * cy) ** 2 + (0.15 * s * sy) ** 2) + k * 0.02;
      rrectPath(ctx, c[0] - e, c[1] - k * 0.22 * s, e * 2, k * 0.42 * s, k * 0.06 * s); ink(ctx, P.bag.color, lw);
    } else if (P.bag.type === 'cross') {
      const hp = S([pose.pelvis[0] + 0.02 * s, pose.pelvis[1] + 0.1 * s, pose.hipL[2] * 1.3]);
      const other = S(pose[side === 'L' ? 'shR' : 'shL']);
      line(ctx, [other, hp], lw * 0.9, dark(P.bag.color, 0.2));
      rrectPath(ctx, hp[0] - k * 0.1 * s, hp[1] - k * 0.07 * s, k * 0.2 * s, k * 0.15 * s, k * 0.03 * s); ink(ctx, P.bag.color, lw);
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
        const bx = cxh + Rh * 0.9 * Math.cos(hy + Math.PI), sw = Math.sin((st.t || 0) * 5 + P.seed) * 0.12;
        ctx.beginPath(); ctx.moveTo(bx - Rh * 0.16, cyh - Rh * 0.45); ctx.quadraticCurveTo(bx - fx * Rh * 0.45 + sw * Rh, cyh + Rh * 0.6, bx - fx * Rh * 0.2 + sw * Rh * 1.5, cyh + Rh * 1.35);
        ctx.quadraticCurveTo(bx + fx * Rh * 0.1 + Rh * 0.12, cyh + Rh * 0.5, bx + Rh * 0.16, cyh - Rh * 0.45); ctx.closePath(); ink(ctx, hcCol, lw);
        ell(ctx, bx, cyh - Rh * 0.42, Rh * 0.12, Rh * 0.1, dark(hcCol, 0.2), 0);
      }
    };
    // long hair falls behind the head and shoulders
    if (hs === 'long' || hs === 'bob') {
      const L = hs === 'long' ? 1.75 : 1.0;
      const bx = cxh - fx * Rh * 0.28 * (1 - Math.max(0, fz));
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
  if (P.bag && P.bag.type === 'backpack' && cy * 1 !== 0 && Math.sin(st.yaw) > 0.2) drawBag();
  for (const a of farArm) drawArm(a, true);
  if (P.bag && P.bag.type === 'tote' && zOf(pose[`sh${P.bag.side || 'L'}`]) < 0) drawBag();
  if (coat) { for (const l of legs) drawLeg(l.side, l.dz < -0.01); drawTorso(); }
  else { for (const l of legs) drawLeg(l.side, l.dz < -0.01); drawTorso(); }
  if (P.bag && (P.bag.type === 'backpack' ? Math.sin(st.yaw) <= 0.2 : P.bag.type === 'cross' || zOf(pose[`sh${P.bag.side || 'L'}`]) >= 0)) drawBag();
  nearArm.sort((a, b) => zOf(pose[`el${a}`]) - zOf(pose[`el${b}`]));
  // head before the near arm only when an arm is raised in front of the face
  drawHead();
  for (const a of nearArm) drawArm(a, false);
  ctx.restore();
}
