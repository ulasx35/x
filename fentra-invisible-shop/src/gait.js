// Locomotion: a footstep planner and a little physics, precomputed per actor at 240 Hz.
//  • The pelvis follows the choreographed path through a critically damped tracker (smooth corners and speed changes).
//  • Feet are planted in the world: heel strike → foot flat → heel rise → toe-off, swinging on a real ankle path.
//    Turning or settling on the spot produces small adjustment steps; nothing ever slides.
//  • Cadence and step length follow walking speed; the trunk leans into acceleration on a damped spring;
//    bags, hand-held bags and ponytails are damped pendulums driven by the body's real accelerations.
import { TAU, clamp, lerp, sstep } from './core.js';

const frac = (x) => x - Math.floor(x);
export const G = { D: 0.6, ref: 1.3, S0: 1.42, dt: 1 / 240, g: 9.81, reach: 0.47 };
export const dims = (P) => {
  const s = P.h / 1.75;
  return { s, thigh: 0.44 * s, shin: 0.43 * s, ankleH: 0.085 * s, hw: 0.092 * s * P.build, lat: 0.058 * s, latStand: 0.1 * s, heel: 0.062 * s, ball: 0.128 * s, upper: 0.3 * s, fore: 0.27 * s };
};
export const strideAt = (P, v) => G.S0 * (P.h / 1.75) * clamp(Math.pow(Math.max(v, 0.05) / G.ref, 0.65), 0.35, 1.12);
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// arm swing (shared by the pose and the hand-bag pendulum)
export const armSwing = (walk, sc, u) => -(0.2 + 0.14 * sc) * walk * Math.cos(TAU * (u - 0.04));

// ankle position of a foot rotated about its heel (θ > 0, toes up) or its ball (φ < 0, heel up)
function rockAnkle(d, gx, gz, yaw, pitch) {
  const cx = Math.cos(yaw), cz = Math.sin(yaw), h = d.ankleH - 0.008 * d.s;
  let f, y;
  if (pitch >= 0) { // about the heel contact
    const px = -d.heel, rx = d.heel, ry = h; // vector heel → ankle when flat
    f = px + rx * Math.cos(pitch) - ry * Math.sin(pitch); y = 0.008 * d.s + rx * Math.sin(pitch) + ry * Math.cos(pitch);
  } else { // about the ball contact
    const px = d.ball, rx = -d.ball, ry = h;
    f = px + rx * Math.cos(pitch) - ry * Math.sin(pitch); y = 0.008 * d.s + rx * Math.sin(pitch) + ry * Math.cos(pitch);
  }
  return [gx + cx * f, y, gz + cz * f];
}

// fields stored per sample
const F = ['x', 'z', 'yaw', 'phase', 'walk', 'sc', 'speed', 'lean', 'bag', 'hbag', 'pony', 'sway',
  'Rx', 'Ry', 'Rz', 'Rp', 'Ryaw', 'Rw', 'Rlr', 'Lx', 'Ly', 'Lz', 'Lp', 'Lyaw', 'Lw', 'Llr'];
export const FIELDS = Object.fromEntries(F.map((k, i) => [k, i]));
const NF = F.length;

export function simulate(actor) {
  const { P, spec } = actor, d = dims(P), dt = G.dt;
  const pre = spec.walk0 ? 1.6 : 0.0; // walkers who enter already walking get a pre-roll
  const t0 = actor.t0 - pre, n = Math.ceil((actor.t1 - t0) / dt) + 2;
  const tab = new Float64Array(n * NF);
  const at = (i, k) => tab[i * NF + FIELDS[k]];
  const put = (i, k, v) => { tab[i * NF + FIELDS[k]] = v; };

  // the choreographed path (extrapolated backwards for the pre-roll) and its velocity
  const [kx0, kz0] = actor.posAt(actor.t0), [kx1, kz1] = actor.posAt(actor.t0 + 0.05);
  const v0 = [(kx1 - kx0) / 0.05, (kz1 - kz0) / 0.05];
  const path = (t) => (t < actor.t0 ? [kx0 + v0[0] * (t - actor.t0), kz0 + v0[1] * (t - actor.t0)] : actor.posAt(t));

  // ---------------------------------------------------------------- pass 1: body
  let [px, pz] = path(t0), vx = spec.walk0 ? v0[0] : 0, vz = spec.walk0 ? v0[1] : 0;
  let yaw = spec.yaw0 ?? actor.keys[0].yaw ?? 0, phase = spec.phase0 || 0, walk = spec.walk0 ? 1 : 0;
  let lean = 0.02, leanV = 0, prevSpeed = Math.hypot(vx, vz), afwd = 0;
  const pend = { bag: [0, 0], hbag: [0, 0], pony: [0, 0] };
  let prevHand = null, prevHandV = 0, prevBob = null, prevBobV = 0;
  const W = 8.0; // tracker stiffness (rad/s)
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt;
    const [tx, tz] = path(t), [tx2, tz2] = path(t + 0.01);
    const tvx = (tx2 - tx) / 0.01, tvz = (tz2 - tz) / 0.01;
    if (i > 0) {
      const ax = W * W * (tx - px) + 2 * W * (tvx - vx), az = W * W * (tz - pz) + 2 * W * (tvz - vz);
      vx += ax * dt; vz += az * dt; px += vx * dt; pz += vz * dt;
    }
    const speed = Math.hypot(vx, vz);
    // facing
    let target = null;
    if (speed > 0.12) target = Math.atan2(vz, vx);
    else { const hy = actor.holdYaw(actor.segAt(t)); if (hy != null) target = hy; }
    if (target != null) yaw += angDiff(yaw, target) * Math.min(1, dt * (speed > 0.12 ? 6.5 : 4.0));
    // gait timing: cadence and step length both grow with speed
    const S = strideAt(P, speed);
    phase += speed * dt / S;
    walk += (sstep(0.1, 0.5, speed) - walk) * Math.min(1, dt * 7);
    const sc = clamp(Math.pow(Math.max(speed, 0.05) / G.ref, 0.55), 0.35, 1.12);
    // forward acceleration (low-passed) → trunk lean on a damped spring
    const a = (speed - prevSpeed) / dt; prevSpeed = speed;
    afwd += (a - afwd) * Math.min(1, dt * 12);
    const leanT = 0.012 + 0.03 * Math.min(speed, 1.7) / G.ref + clamp(0.035 * afwd, -0.06, 0.06);
    const wl = 9, zl = 0.42;
    leanV += (wl * wl * (leanT - lean) - 2 * zl * wl * leanV) * dt; lean += leanV * dt;
    // gait-induced pivot accelerations: vertical bob and forward surge
    const bob = -0.02 * d.s * walk * sc * Math.cos(2 * TAU * (phase - 0.3));
    const bobV = prevBob == null ? 0 : (bob - prevBob) / dt; const bobA = prevBob == null ? 0 : (bobV - prevBobV) / dt; prevBob = bob; prevBobV = bobV;
    const surge = -1.1 * walk * sc * sc * Math.sin(2 * TAU * (phase - 0.05));
    const ax = afwd + surge, ay = clamp(bobA, -6, 6);
    // hand pivot (arm swing) for bags carried in the hand
    const side = P.propSide === 'L' ? 0.5 : 0;
    const hand = d.upper * 1.7 * Math.sin(armSwing(walk, sc, frac(phase + side)) * 0.35);
    const handV = prevHand == null ? 0 : (hand - prevHand) / dt; const handA = prevHand == null ? 0 : clamp((handV - prevHandV) / dt, -12, 12); prevHand = hand; prevHandV = handV;
    // damped pendulums (angle from vertical, + swings forward)
    const step = (st, L, c, axx) => {
      const acc = -((G.g + ay) / L) * Math.sin(st[0]) - (axx / L) * Math.cos(st[0]) - c * st[1];
      st[1] += acc * dt; st[0] = clamp(st[0] + st[1] * dt, -0.9, 0.9);
    };
    step(pend.bag, 0.32, 3.2, ax); step(pend.hbag, 0.22, 2.4, ax + handA); step(pend.pony, 0.15, 4.5, ax);
    // weight shift while standing
    const sway = (1 - walk) * 0.012 * d.s * Math.sin(t * 0.55 + P.seed * 1.7);
    put(i, 'x', px); put(i, 'z', pz); put(i, 'yaw', yaw); put(i, 'phase', phase); put(i, 'walk', walk); put(i, 'sc', sc);
    put(i, 'speed', speed); put(i, 'lean', lean); put(i, 'bag', clamp(pend.bag[0], -0.35, 0.35)); put(i, 'hbag', pend.hbag[0]); put(i, 'pony', pend.pony[0]); put(i, 'sway', sway);
  }

  // ---------------------------------------------------------------- pass 2: feet
  const fwd = (i) => [Math.cos(at(i, 'yaw')), Math.sin(at(i, 'yaw'))];
  const left = (i) => [-Math.sin(at(i, 'yaw')), Math.cos(at(i, 'yaw'))];
  const clampI = (i) => Math.max(0, Math.min(n - 1, i));
  const standIdeal = (i, sgn) => {
    i = clampI(i); const f = fwd(i), l = left(i), dx = sgn < 0 ? 0.035 * d.s : -0.015 * d.s;
    return [at(i, 'x') + f[0] * dx + l[0] * sgn * d.latStand, at(i, 'z') + f[1] * dx + l[1] * sgn * d.latStand];
  };
  const walkTarget = (j, sgn) => {
    j = clampI(j);
    const S = strideAt(P, at(j, 'speed')), R0 = G.reach * G.D * S, f = fwd(j), l = left(j);
    const w = [at(j, 'x') + f[0] * R0 + l[0] * sgn * d.lat, at(j, 'z') + f[1] * R0 + l[1] * sgn * d.lat];
    const s = standIdeal(j, sgn), k = sstep(0.25, 0.7, at(j, 'walk'));
    return [lerp(s[0], w[0], k), lerp(s[1], w[1], k)];
  };
  const feet = [{ key: 'R', off: 0, sgn: -1 }, { key: 'L', off: 0.5, sgn: 1 }];
  // initial stance
  for (const f of feet) {
    const p = standIdeal(0, f.sgn);
    f.plant = { x: p[0], z: p[1], yaw: at(0, 'yaw'), t: t0 - 1, mode: 'adjust', cyc: null }; f.swing = null;
  }
  let lastStep = -10;
  actor.falls = [];
  const ankleOf = (f, i, t) => {
    // current ankle (world), pitch, yaw, pelvis-constraint weight, loading-response bump
    if (f.swing) {
      const s = f.swing, w = clamp((t - s.t0) / (s.t1 - s.t0));
      const e = w - Math.sin(TAU * w) / TAU;
      const walkStep = s.kind === 'walk';
      const toPitch = walkStep ? 0.26 : 0;
      const to = rockAnkle(d, s.to[0], s.to[1], s.toYaw, toPitch);
      const lift = walkStep ? 0.075 * d.s * Math.sqrt(s.sc) : 0.045 * d.s;
      const y = lerp(s.from[1], to[1], e) + lift * Math.pow(Math.sin(Math.PI * w), 1.4) * (1.15 - 0.45 * w);
      const pitch = walkStep ? (w < 0.45 ? lerp(s.fromPitch, -0.1, sstep(0, 0.45, w)) : lerp(-0.1, toPitch, sstep(0.45, 1, w))) : -0.18 * Math.sin(Math.PI * w);
      const fy = s.fromYaw + angDiff(s.fromYaw, s.toYaw) * e;
      return { a: [lerp(s.from[0], to[0], e), y, lerp(s.from[2], to[2], e)], pitch, yaw: fy, w: sstep(0.8, 1, w), lr: 0 };
    }
    const p = f.plant;
    let pitch = 0, lr = 0;
    if (p.mode === 'walk') {
      const gw = at(i, 'walk');
      const us = clamp(frac(at(i, 'phase') + f.off) / G.D);
      const sinceP = t - p.t;
      const heel = 0.26 * (1 - sstep(0, 0.14, us)) * (sinceP < 0.6 ? 1 : 0);
      const toe = -0.9 * Math.pow(sstep(0.5, 1.0, us), 1.3);
      pitch = (heel > 0.001 ? heel : toe) * gw;
      lr = sinceP < 0.6 ? Math.sin(Math.PI * clamp(sinceP / 0.28)) : 0;
    }
    return { a: rockAnkle(d, p.x, p.z, p.yaw, pitch), pitch, yaw: p.yaw, w: 1, lr };
  };
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt;
    const walkI = at(i, 'walk');
    for (const f of feet) {
      // landing
      if (f.swing && t >= f.swing.t1) {
        const s = f.swing;
        f.plant = { x: s.to[0], z: s.to[1], yaw: s.toYaw, t, mode: s.kind, cyc: s.kind === 'walk' ? Math.floor(at(i, 'phase') + f.off) : null };
        if (t >= actor.t0 - 0.01) actor.falls.push([t, s.to[0], s.to[1], s.kind === 'walk' ? 1 : 0.45]);
        f.swing = null; lastStep = t;
      }
      // toe-off, timed by the gait phase: a foot leaves once its stance for this cycle is over
      // (or, when walking starts, as soon as the gait says it should be in the air)
      if (!f.swing && walkI > 0.2) {
        const pu = at(i, 'phase') + f.off, cyc = Math.floor(pu), u = pu - cyc;
        const other = feet.find((o) => o !== f);
        const mine = f.plant.cyc == null || f.plant.cyc === cyc;
        if (u >= G.D && u < 0.93 && mine && t - f.plant.t > 0.1 && !other.swing) {
          let j = -1;
          for (let k = i + 1; k < Math.min(n, i + Math.round(1.6 / dt)); k++) if (Math.floor(at(k, 'phase') + f.off) > cyc) { j = k; break; }
          const cur = ankleOf(f, i, t);
          if (j > 0 && (j - i) * dt > 0.16) f.swing = { kind: 'walk', t0: t, t1: t0 + j * dt, from: cur.a, fromPitch: cur.pitch, fromYaw: cur.yaw, to: walkTarget(j, f.sgn), toYaw: at(j, 'yaw'), sc: at(i, 'sc') };
          else { const k = i + Math.round(0.42 / dt); f.swing = { kind: 'adjust', t0: t, t1: t + 0.42, from: cur.a, fromPitch: cur.pitch, fromYaw: cur.yaw, to: standIdeal(k, f.sgn), toYaw: at(clampI(k), 'yaw'), sc: 0.5 }; }
        } else if (f.plant.cyc == null && u < G.D && f.plant.mode === 'adjust') {
          // a foot already under the body when walking begins simply becomes this cycle's stance foot
          f.plant.cyc = cyc;
        }
      }
      // never let a planted foot be dragged beyond the leg's reach
      if (!f.swing) {
        const hx = at(i, 'x'), hz = at(i, 'z');
        if (Math.hypot(f.plant.x - hx, f.plant.z - hz) > (d.thigh + d.shin) * 0.72 && t - f.plant.t > 0.1 && !feet.find((o) => o !== f).swing) {
          const cur = ankleOf(f, i, t), k = i + Math.round(0.36 / dt);
          f.swing = { kind: walkI > 0.2 ? 'walk' : 'adjust', t0: t, t1: t + 0.36, from: cur.a, fromPitch: cur.pitch, fromYaw: cur.yaw, to: walkI > 0.2 ? walkTarget(k, f.sgn) : standIdeal(k, f.sgn), toYaw: at(clampI(k), 'yaw'), sc: at(i, 'sc') };
        }
      }
    }
    // settling steps when standing (after stopping, or turning on the spot)
    const walkSoon = at(clampI(i + Math.round(0.35 / dt)), 'walk');
    if (walkI < 0.3 && walkSoon < 0.3 && !feet[0].swing && !feet[1].swing && t - lastStep > 0.14) {
      let worst = null, wd = 0;
      for (const f of feet) {
        const id = standIdeal(i, f.sgn);
        const dev = Math.hypot(f.plant.x - id[0], f.plant.z - id[1]) + 0.1 * d.s * Math.abs(angDiff(f.plant.yaw, at(i, 'yaw'))) / 0.35;
        if (dev > wd) { wd = dev; worst = f; }
      }
      if (worst && wd > 0.085 * d.s) {
        const k = i + Math.round(0.4 / dt), cur = ankleOf(worst, i, t);
        worst.swing = { kind: 'adjust', t0: t, t1: t + 0.4, from: cur.a, fromPitch: cur.pitch, fromYaw: cur.yaw, to: standIdeal(k, worst.sgn), toYaw: at(clampI(k), 'yaw'), sc: 0.5 };
      }
    }
    for (const f of feet) {
      const r = ankleOf(f, i, t);
      put(i, `${f.key}x`, r.a[0]); put(i, `${f.key}y`, r.a[1]); put(i, `${f.key}z`, r.a[2]);
      put(i, `${f.key}p`, r.pitch); put(i, `${f.key}yaw`, r.yaw); put(i, `${f.key}w`, r.w); put(i, `${f.key}lr`, r.lr);
    }
  }
  return { tab, n, t0, NF };
}

// ---------------------------------------------------------------- pose from the simulated body and feet
function ik3(H, A, l1, l2, pole) {
  // two-bone IK in 3D: knee bends toward the pole direction
  let dx = A[0] - H[0], dy = A[1] - H[1], dz = A[2] - H[2];
  let dist = Math.hypot(dx, dy, dz) || 1e-6; const maxd = (l1 + l2) * 0.9995;
  if (dist > maxd) { const k = maxd / dist; dx *= k; dy *= k; dz *= k; dist = maxd; }
  const ux = dx / dist, uy = dy / dist, uz = dz / dist;
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pd = pole[0] * ux + pole[1] * uy + pole[2] * uz;
  let px = pole[0] - pd * ux, py = pole[1] - pd * uy, pz = pole[2] - pd * uz; const pl = Math.hypot(px, py, pz) || 1;
  px /= pl; py /= pl; pz /= pl;
  return { knee: [H[0] + ux * a + px * h, H[1] + uy * a + py * h, H[2] + uz * a + pz * h], ankle: [H[0] + dx, H[1] + dy, H[2] + dz] };
}

// S: interpolated sample (object with FIELDS keys). Returns a pose in body space (x forward, y up, z left).
export function locoPose(P, S, t, extra = {}) {
  const d = dims(P), s = d.s;
  const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw);
  const toLocal = (wx, wy, wz) => { const dx = wx - S.x, dz = wz - S.z; return [dx * cy + dz * sy, wy, -dx * sy + dz * cy]; };
  const walk = S.walk, ph = S.phase;
  const pose = { s, thigh: d.thigh, shin: d.shin, upper: d.upper, fore: d.fore, ankleH: d.ankleH, sw: 0.158 * s * P.build * (P.fem ? 0.92 : 1), shY: 1.43 * s, neckY: 1.5 * s, headY: 1.635 * s };
  // pelvis: lateral shift over the stance foot, transverse rotation, obliquity
  const sway = -0.022 * s * walk * Math.sin(TAU * (ph - 0.05)) + S.sway;
  const rot = 0.028 * s * walk * S.sc * Math.cos(TAU * ph);
  const obl = 0.01 * s * walk * Math.sin(TAU * (ph - 0.05));
  const feet = {};
  for (const k of ['R', 'L']) {
    const a = toLocal(S[`${k}x`], S[`${k}y`], S[`${k}z`]);
    feet[k] = { a, w: S[`${k}w`], lr: S[`${k}lr`], pitch: S[`${k}p`], yawRel: angDiff(S.yaw, S[`${k}yaw`]) };
  }
  const hipOff = { R: [rot, obl, -d.hw], L: [-rot, -obl, d.hw] };
  // pelvis height: as tall as the legs allow — the natural compass-gait rise and fall — with a soft knee on landing
  const Lmax = (d.thigh + d.shin) * 0.992;
  let y = d.ankleH + (d.thigh + d.shin) * 0.985 - 0.03 * s * walk - 0.014 * s * walk * (feet.R.lr + feet.L.lr);
  const nominal = y;
  for (const k of ['R', 'L']) {
    const f = feet[k], hx = hipOff[k][0], hz = hipOff[k][2] + sway;
    const dh = Math.hypot(f.a[0] - hx, f.a[2] - hz);
    const allow = f.a[1] + Math.sqrt(Math.max(0.01, Lmax * Lmax - dh * dh)) - hipOff[k][1];
    const lim = lerp(nominal, allow, f.w);
    if (lim < y) y = lim - 0.0;
  }
  const pelvisY = Math.max(y, nominal - 0.075 * s);
  const lean = S.lean + (extra.lean || 0);
  const L = (yy) => (yy - pelvisY) * Math.sin(lean);
  pose.lean = lean; pose.pelvis = [0, pelvisY, sway];
  const breath = Math.sin(t * 1.7 + P.seed * 2) * 0.004 * s * (1 - walk * 0.5);
  // shoulders counter-rotate against the pelvis
  const srot = -0.024 * s * walk * S.sc * Math.cos(TAU * ph);
  pose.shL = [L(pose.shY) - 0.01 * s - srot, pose.shY + breath - obl * 0.4, pose.sw + sway * 0.6];
  pose.shR = [L(pose.shY) - 0.01 * s + srot, pose.shY + breath + obl * 0.4, -pose.sw + sway * 0.6];
  pose.neck = [L(pose.neckY), pose.neckY + breath, sway * 0.5];
  pose.head = [L(pose.headY) + 0.01 * s, pose.headY + breath, sway * 0.45];
  for (const k of ['R', 'L']) {
    const H = [hipOff[k][0], pelvisY + hipOff[k][1], hipOff[k][2] + sway];
    pose[`hip${k}`] = H;
    const f = feet[k];
    const pole = [Math.cos(f.yawRel), 0.08, Math.sin(f.yawRel) + (k === 'R' ? -0.08 : 0.08)];
    const { knee, ankle } = ik3(H, f.a, d.thigh, d.shin, pole);
    pose[`kn${k}`] = knee; pose[`an${k}`] = ankle; pose[`fp${k}`] = f.pitch; pose[`fy${k}`] = f.yawRel;
  }
  pose.walk = walk; pose.phase = ph; pose.sc = S.sc; pose.speed = S.speed;
  pose.bag = S.bag; pose.hbag = S.hbag; pose.pony = S.pony;
  return pose;
}
