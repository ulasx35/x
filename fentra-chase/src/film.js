// Fentra — "Görünür" (animated brand film). Deterministic: every frame is a pure function of time t.
import { W, H, clamp, lerp, inv, sstep, easeIO, easeOut, easeIn, sine, win, lerp3, TAU, mulberry32, noise1, hex, rgb, mix, Cam, figure, castShadow, glow, softDisc, beam, scratch, peek, fogged } from './engine.js';
import { MAN, CUSTOMERS, gait, RUN, WALK, footfalls, manSide, manFront, manBack, personSide, personFront, personBack, faceFront, hatFront, manSeated, headProfile, tr } from './characters.js';
import { renderWorld, groundPool, reflection, LAMPS, lampPos } from './world.js';
import { ACT2 } from './act2.js';
import { ACT3, initAct3 } from './act3.js';

const WARM = hex('#ffb866');
const COOL_RIM = hex('#9fb4d6');

import { actorT, makePath, contactShadow, mirrorBelow } from './common.js';
export { actorT, makePath, contactShadow, mirrorBelow };

// ------------------------------------------------------------------ Act 1 — the chase
const cam = new Cam();

// His route through Street A (from the side street, around the corner, north).
const ROUTE = makePath([[-11, 0, -0.4], [-4.5, 0, -0.6], [-1.6, 0, -1.6], [0.2, 0, -4.2], [0.4, 0, -44.2], [2.4, 0, -46.9], [6, 0, -47.6], [18.9, 0, -47.6], [19.3, 0, -50.5], [19.25, 0, -58.8]]);
const MAN_T0 = 1.25; // he bursts in from the side street
const V = RUN.v;
// Story positions (metres along ROUTE) at the start of each chase shot. Editing compresses time between
// shots, but order, direction and the gap between him and the group always stay consistent.
const STORY = {
  S1: { t0: 0.0, man: 4.6 - MAN_T0 * V, grp: -40 },
  S2: { t0: 4.4, man: 22.5, grp: 8.2 },
  S3: { t0: 7.0, man: 30 },
  S4: { t0: 8.6, man: 29.5 },
  S5: { t0: 11.6, man: 38 },
  S6: { t0: 13.2, man: 70, grp: 23.4 },
  S7: { t0: 15.4, man: 70, grp: 33.5 },
  S8: { t0: 17.2, man: 46.3, grp: 40.0 },
};
let CUR = STORY.S1;
export const manS = (t) => CUR.man + (t - CUR.t0) * V;
const grpS = (t) => CUR.grp + (t - CUR.t0) * V;
// The group follows the same route in a loose formation.
export const GROUP = CUSTOMERS.map((c, i) => ({ c, lag: [0, 0.9, 1.6, 2.5, 3.3][i], side: [-0.55, 0.6, -0.2, 0.45, -0.5][i], phase: [0.1, 0.43, 0.77, 0.25, 0.6][i] }));

function manWorld(t) { return ROUTE.at(manS(t)); }
function groupWorld(g, t) {
  const s = grpS(t) - g.lag;
  const a = ROUTE.at(s);
  const nx = -a.dir[1], nz = a.dir[0];
  return { p: [a.p[0] + nx * g.side, 0, a.p[2] + nz * g.side], dir: a.dir, s };
}

function drawManBackRun(ctx, cam, pos, t, rim) {
  const T = actorT(cam, pos);
  if (T.d <= 0.3) return;
  const ph = manS(t) / (V * RUN.T);
  const sil = figure(ctx, (g) => manBack(g, T, { phase: ph }), {
    rims: rim || [{ dir: [0, -1], color: WARM, a: 0.55, w: Math.max(1.5, T.s * 0.02) }],
    shade: { from: [0, T.oy - T.s * 1.8], to: [0, T.oy], a: 0.35 },
  });
  return sil;
}
function drawPersonBackRun(ctx, cam, g, pos, t, dark = 0.55) {
  const T = actorT(cam, pos);
  if (T.d <= 0.3) return;
  const ph = (t * 1.43 + g.phase);
  figure(ctx, (gg) => { personBack(gg, T, g.c, 0.15); }, {
    dark, rims: [{ dir: [0, -1], color: WARM, a: 0.5, w: Math.max(1.5, T.s * 0.018) }, { dir: [1, 0], color: COOL_RIM, a: 0.25, w: Math.max(1, T.s * 0.012) }],
  });
  // running bob for the silhouette (subtle)
  return ph;
}

// Group runner seen from behind with a proper alternating stride (reuses the businessman back-run legs logic).
function personBackRun(ctx, cam, g, pos, t) {
  const T = actorT(cam, pos);
  if (T.d <= 0.3) return;
  const ph = (grpS(t) - g.lag) / (V * RUN.T) + g.phase;
  const bob = Math.abs(Math.sin(TAU * ph)) * 0.03;
  const T2 = { ...T, oy: T.oy - T.s * bob };
  figure(ctx, (gg) => {
    // legs alternate
    for (const [i, sd] of [[0, -1], [1, 1]]) {
      const lift = Math.max(0, Math.sin(TAU * (ph + i * 0.5)));
      const k = g.c.h / 1.8;
      const hip = tr(T2, sd * 0.09 * g.c.w, 0.9 * k), knee = tr(T2, sd * 0.1 * g.c.w, (0.48 + lift * 0.12) * k), ank = tr(T2, sd * 0.1 * g.c.w, (0.08 + lift * 0.33) * k);
      gg.lineCap = 'round';
      gg.strokeStyle = g.c.bottom; gg.lineWidth = T.s * 0.13 * g.c.w; gg.beginPath(); gg.moveTo(...hip); gg.lineTo(...knee); gg.lineTo(...ank); gg.stroke();
      gg.fillStyle = g.c.shoe; gg.beginPath(); gg.ellipse(ank[0], ank[1] + T.s * 0.05, T.s * 0.055, T.s * (0.04 + lift * 0.04), 0, 0, TAU); gg.fill();
    }
    personBack(gg, T2, g.c, 0.1 + 0.25 * Math.max(0, Math.sin(TAU * ph)));
  }, { dark: 0.78, rims: [{ dir: [0, -1], color: WARM, a: 0.6, w: Math.max(1.5, T.s * 0.02) }, { dir: [-1, 0], color: COOL_RIM, a: 0.22, w: Math.max(1, T.s * 0.012) }] });
}

// ---- S1: quiet street → he bursts around the corner and runs away from us
function S1(ctx, t) {
  CUR = STORY.S1;
  const lt = t;
  const cp = lerp3([1.5, 1.22, 8.5], [0.9, 1.3, 5.0], easeIO(lt / 4.4));
  cam.set(cp, [0.2, 1.75, -30], 46);
  const actors = [];
  if (t >= MAN_T0) {
    const w = manWorld(t);
    const heading = Math.atan2(w.dir[0], -w.dir[1]); // 0 = north, +90° = east
    actors.push({
      pos: w.p, draw: (c) => {
        contactShadow(c, cam, w.p, 0.35, 0.6);
        const sideK = sstep(0.55, 1.2, Math.abs(heading)); // crossing the frame → profile
        if (sideK > 0.02) {
          const T = actorT(cam, w.p, 1);
          const pose = gait(manS(t) / V, RUN);
          const Ts = { ...T, ox: T.ox - pose.px * T.s };
          figure(c, (g) => manSide(g, Ts, pose), { alpha: sideK, rims: [{ dir: [0.3, -1], color: WARM, a: 0.6, w: T.s * 0.02 }], shade: { from: [0, T.oy - T.s * 1.8], to: [0, T.oy], a: 0.3 } });
        }
        if (sideK < 0.98) { c.save(); c.globalAlpha = 1 - sideK; drawManBackRun(c, cam, w.p, t); c.restore(); }
      },
    });
  }
  renderWorld(ctx, cam, { actors });
}

// ---- S2: behind the group as they turn the same corner; he is already far ahead
function S2(ctx, t) {
  CUR = STORY.S2;
  const lt = t - 4.4;
  const cp = lerp3([-1.2, 2.6, 7.5], [-0.8, 2.5, 5.8], easeIO(lt / 2.6));
  cam.set(cp, [0.3, 1.9, -30], 44);
  const actors = [];
  const w = manWorld(t);
  actors.push({ pos: w.p, draw: (c) => { contactShadow(c, cam, w.p, 0.35, 0.4); drawManBackRun(c, cam, w.p, t); } });
  for (const g of GROUP) {
    const q = groupWorld(g, t);
    if (q.s < 0) continue;
    actors.push({ pos: q.p, draw: (c) => { contactShadow(c, cam, q.p, 0.32, 0.5); personBackRun(c, cam, g, q.p, t); } });
  }
  renderWorld(ctx, cam, { actors });
}

// ---- S3: polished shoes striking wet stone (side, very low, tracking)
function S3(ctx, t) {
  CUR = STORY.S3;
  const lt = t - 7.0;
  const w = manWorld(t);
  // camera on the east side, looking west, at ankle height, tracking with him
  cam.set([w.p[0] + 3.2, 0.22, w.p[2] - 0.35], [w.p[0] - 2, 0.3, w.p[2] - 0.35], 30);
  renderWorld(ctx, cam, { lampGain: 1.2 });
  // shallow depth of field: soften the whole background plate
  const [bc, bg] = scratch(5); bg.filter = 'blur(10px)'; bg.drawImage(ctx.canvas, 0, 0);
  ctx.drawImage(bc, 0, 0);
  const T0 = actorT(cam, [w.p[0], 0, w.p[2]], 1);
  const pose = gait(manS(t) / V, RUN);
  // hold the pelvis steady in frame (camera tracks), feet plant on the ground
  const T = { ...T0, ox: W * 0.5 - pose.hip[0] * T0.s + T0.s * 0.05 };
  const groundY = T.oy;
  // wet mirror of the legs
  const sil = figure(ctx, (g) => manSide(g, T, pose, { flare: 1 }), { rims: [{ dir: [-0.4, -1], color: WARM, a: 0.8, w: T.s * 0.006 }, { dir: [1, -0.2], color: COOL_RIM, a: 0.25, w: T.s * 0.004 }], shade: { from: [0, groundY - T.s * 0.6], to: [0, groundY], a: 0.25 } });
  mirrorBelow(ctx, groundY, 0.3, 4);
  // splashes at each footfall
  const falls = footfalls(RUN, 0, 60).map((x) => x + MAN_T0);
  for (const f of falls) {
    const age = t - f; if (age < 0 || age > 0.5) continue;
    const pf = gait(f - MAN_T0, RUN);
    const leg = pf.legs.reduce((a, b) => (a.ankle[1] < b.ankle[1] ? a : b));
    const fx = T.ox + T.s * (leg.ankle[0] + 0.1);
    const r = mulberry32(Math.floor(f * 1000));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) {
      const vx = (r() - 0.5) * 2.4, vy = 1.2 + r() * 1.8;
      const x = fx + T.s * (vx * age), y = groundY - T.s * (vy * age - 4.9 * age * age);
      if (y > groundY) continue;
      ctx.fillStyle = `rgba(255,205,150,${(0.55 * (1 - age / 0.5)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, T.s * (0.004 + r() * 0.004), 0, TAU); ctx.fill();
    }
    ctx.restore();
    // ripple
    ctx.save(); ctx.strokeStyle = `rgba(255,200,140,${(0.35 * (1 - age / 0.5)).toFixed(3)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(fx, groundY + 4, T.s * (0.05 + age * 0.5), T.s * (0.008 + age * 0.05), 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
}

// ---- S4: side tracking — full figure, coat flowing, facades sliding past
function S4(ctx, t) {
  CUR = STORY.S4;
  const lt = t - 8.6;
  const w = manWorld(t);
  const d = 4.1;
  cam.set([w.p[0] + d, 1.2, w.p[2] + 0.35 - lt * 0.12], [w.p[0] - 3, 1.45, w.p[2] + 0.35 - lt * 0.12], 44);
  const actors = [{
    pos: w.p, draw: (c) => {
      const T0 = actorT(cam, w.p, 1);
      const pose = gait(manS(t) / V, RUN);
      // pin the figure to its world position (anchor at the hip)
      const Tp = { ...T0, ox: T0.ox - pose.hip[0] * T0.s };
      contactShadow(c, cam, w.p, 0.4, 0.5);
      const sil = figure(c, (g) => manSide(g, Tp, pose), { rims: [{ dir: [-0.5, -1], color: WARM, a: 0.65, w: T0.s * 0.018 }, { dir: [1, 0], color: COOL_RIM, a: 0.22, w: T0.s * 0.01 }], shade: { from: [0, T0.oy - T0.s * 1.8], to: [0, T0.oy], a: 0.35 } });
      mirrorBelow(c, T0.oy, 0.2, 5);
    },
  }];
  renderWorld(ctx, cam, { actors });
}

// ---- S5: extreme close-up — anxious eyes looking back over his shoulder
function S5(ctx, t) {
  CUR = STORY.S5;
  const lt = t - 11.6;
  const w = manWorld(t);
  // long lens from behind-left: background is Street A behind him (the way he came)
  cam.set([w.p[0] - 1.6, 1.62, w.p[2] + 1.2], [w.p[0] + 3, 1.2, w.p[2] + 14], 38);
  renderWorld(ctx, cam, {});
  const [bc, bg] = scratch(5); bg.filter = 'blur(16px)'; bg.drawImage(ctx.canvas, 0, 0); ctx.drawImage(bc, 0, 0);
  ctx.fillStyle = 'rgba(6,8,12,0.25)'; ctx.fillRect(0, 0, W, H);
  const ph = manS(t) / (V * RUN.T);
  const bob = Math.sin(TAU * ph * 2) * 0.012;
  const look = sstep(0.3, 0.75, lt);
  const T = { ox: W * 0.46, oy: H * 0.58 + bob * 2600, s: 2600, dir: 1 };
  figure(ctx, (g) => {
    // shoulder + raised collar in the foreground
    g.fillStyle = MAN.coat; g.beginPath(); g.ellipse(W * 0.55, H * 0.92, 520, 300, -0.2, 0, TAU); g.fill();
    g.fillStyle = MAN.coatShade; g.beginPath(); g.ellipse(W * 0.8, H * 0.95, 360, 260, -0.3, 0, TAU); g.fill();
    faceFront(g, T, [0, 0], MAN, { yaw: lerp(0.45, -0.28, look), gazeX: lerp(0.5, -1, look), gazeY: 0.1, brow: 1.1, knit: 0.6, eyeL: 1, eyeR: 1, open: 0.18 + 0.12 * Math.abs(Math.sin(t * 9)) }, 'man', 1);
    hatFront(g, T, [0, 0], MAN, lerp(0.45, -0.28, look));
    g.fillStyle = MAN.coatShade; g.beginPath(); g.moveTo(W * 0.1, H); g.quadraticCurveTo(W * 0.25, H * 0.66, W * 0.62, H * 0.66); g.quadraticCurveTo(W * 0.9, H * 0.7, W * 1.05, H * 0.62); g.lineTo(W * 1.05, H); g.closePath(); g.fill();
  }, { rims: [{ dir: [-1, -0.4], color: WARM, a: 0.55, w: 10 }, { dir: [1, -0.2], color: COOL_RIM, a: 0.2, w: 6 }], spots: [{ x: W * 0.3, y: H * 0.5, r: 900, color: [255, 170, 100], a: 0.14 }] });
}

// ---- S6: the group crossing through the lantern's beam (wide, static, from the east side)
function S6(ctx, t) {
  CUR = STORY.S6;
  const lt = t - 13.2;
  cam.set([2.9, 1.45, -13.2 - lt * 0.35], [-1.2, 2.5, -21.5 - lt * 0.35], 64);
  const actors = [];
  for (const g of GROUP) {
    const q = groupWorld(g, t);
    actors.push({
      pos: q.p, draw: (c) => {
        const T0 = actorT(cam, q.p, 1);
        const pose = gait((grpS(t) - g.lag) / V, { ...RUN, phase: g.phase });
        const Tp = { ...T0, ox: T0.ox - pose.hip[0] * T0.s };
        // lit only while inside the cone of the hanging lantern at z=-20
        const inBeam = Math.exp(-Math.pow((q.p[2] + 20) / 1.3, 2));
        contactShadow(c, cam, q.p, 0.35, 0.5);
        figure(c, (gg) => personSide(gg, Tp, pose, g.c, { props: false }), { dark: 0.8 - inBeam * 0.4, rims: [{ dir: [0, -1], color: WARM, a: 0.3 + inBeam * 0.6, w: T0.s * 0.02 }] });
      },
    });
  }
  renderWorld(ctx, cam, { actors, lampGain: 1.1 });
}

// ---- S7: their shadows stretching across the stone wall
function S7(ctx, t) {
  CUR = STORY.S7;
  const lt = t - 15.4;
  cam.set([2.6, 2.2, -28.2], [-3.5, 2.6, -29.1], 48);
  renderWorld(ctx, cam, { lampGain: 0.8 });
  // a low shop light across the street throws the passing runners onto the wall as long shadows
  const src = cam.project([-3.49, 1.2, -29.1]);
  glow(ctx, src[0] + 40, src[1] + 120, 900, hex('#ffb56a'), 0.18);
  for (const g of GROUP) {
    const q = groupWorld(g, t);
    const x = W * 0.35 + (-(q.p[2]) - 29.1) * 240; // wall-space position (runs left→right)
    const pose = gait((grpS(t) - g.lag) / V, { ...RUN, phase: g.phase });
    const s = 520 + g.side * 60;
    const T = { ox: x - pose.hip[0] * s, oy: H * 0.72, s, dir: 1 };
    const [fc, fg] = scratch(6);
    personSide(fg, T, pose, g.c, { props: true });
    fg.globalCompositeOperation = 'source-in'; fg.fillStyle = '#05060a'; fg.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.62; ctx.filter = 'blur(6px)';
    ctx.setTransform(1.1, 0, 0.32, 1.25, -H * 0.72 * 0.32, -H * 0.72 * 0.25);
    ctx.drawImage(fc, 0, 0); ctx.restore();
  }
}

// ---- S8: high angle — he swings into the narrow alley; the group floods in after him
function S8(ctx, t) {
  CUR = STORY.S8;
  const lt = t - 17.2;
  cam.set([-2.2, 10.5, -36.5 - lt * 0.3], [3.2, 0.5, -46.8], 44);
  const actors = [];
  const w = manWorld(t);
  const drawRunner = (c, pos, dir, pose, drawFn, darkK) => {
    const T0 = actorT(cam, pos, 1);
    const scr = [cam.project([pos[0] + dir[0], 0, pos[2] + dir[1]])[0] - cam.project(pos)[0]];
    const Tp = { ...T0, dir: scr[0] >= 0 ? 1 : -1, ox: T0.ox - (scr[0] >= 0 ? 1 : -1) * pose.hip[0] * T0.s, s: T0.s };
    contactShadow(c, cam, pos, 0.35, 0.55);
    c.save(); c.translate(T0.ox, T0.oy); c.scale(1, 0.82); c.translate(-T0.ox, -T0.oy);
    figure(c, (g) => drawFn(g, Tp, pose), { dark: darkK, rims: [{ dir: [0, -1], color: WARM, a: 0.6, w: T0.s * 0.03 }] });
    c.restore();
  };
  if (manS(t) < ROUTE.L) actors.push({ pos: w.p, draw: (c) => drawRunner(c, w.p, w.dir, gait(manS(t) / V, RUN), (g, T, p) => manSide(g, T, p), 0) });
  for (const g of GROUP) {
    const q = groupWorld(g, t);
    if (q.s < 0) continue;
    actors.push({ pos: q.p, draw: (c) => drawRunner(c, q.p, q.dir, gait((grpS(t) - g.lag) / V, { ...RUN, phase: g.phase }), (gg, T, p) => personSide(gg, T, p, g.c, { props: false }), 0.72) });
  }
  renderWorld(ctx, cam, { actors });
}

// ---- S9: insert — his hand grips the stone corner as he pivots into the alley (backlit, fingers wrap the edge)
function S9(ctx, t) {
  const lt = t - 18.75;
  cam.set([0.9, 1.45, -43.6], [3.5, 1.35, -46.0], 34);
  renderWorld(ctx, cam, { lampGain: 1.15 });
  const edge = cam.project([3.5, 1.35, -46.0]);
  { // the stone corner catches the lantern light
    const a = cam.project([3.5, 0, -46.0]), b = cam.project([3.5, 4.5, -46.0]);
    ctx.save(); ctx.strokeStyle = 'rgba(255,196,130,0.35)'; ctx.lineWidth = 5; ctx.filter = 'blur(2px)';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
  }
  const inP = easeOut(inv(0.0, 0.28, lt)), outP = easeIn(inv(0.7, 1.05, lt));
  const s = 2600;
  // the hand travels in from the right, plants on the wall with fingertips over the edge, then pulls round it
  const hx = lerp(W + 420, edge[0] + s * 0.068, inP) - outP * 520;
  const hy = edge[1] + lerp(40, 0, inP);
  figure(ctx, (g) => {
    g.save();
    g.beginPath(); g.rect(edge[0] - 2, 0, W, H); g.clip(); // nothing passes through the stone: fingers end at the corner
    const X = (x, y) => [hx + x * s, hy - y * s];
    // sleeve + shirt cuff
    g.fillStyle = MAN.coatShade; g.beginPath(); g.moveTo(...X(0.13, 0.075)); g.lineTo(...X(0.5, 0.11)); g.lineTo(...X(0.5, -0.1)); g.lineTo(...X(0.13, -0.065)); g.closePath(); g.fill();
    g.fillStyle = MAN.shirt; g.beginPath(); g.moveTo(...X(0.105, 0.068)); g.lineTo(...X(0.135, 0.075)); g.lineTo(...X(0.135, -0.066)); g.lineTo(...X(0.105, -0.06)); g.closePath(); g.fill();
    // back of the hand
    g.fillStyle = MAN.skin; g.beginPath();
    g.moveTo(...X(0.11, 0.065)); g.bezierCurveTo(...X(0.07, 0.07), ...X(0.035, 0.058), ...X(0.012, 0.045));
    g.lineTo(...X(0.008, -0.04)); g.bezierCurveTo(...X(0.04, -0.05), ...X(0.08, -0.058), ...X(0.11, -0.055)); g.closePath(); g.fill();
    // four fingers reaching over the edge (tips hidden past the corner)
    const fy = [0.033, 0.011, -0.011, -0.031], fl = [0.065, 0.075, 0.072, 0.058], fw = [0.0105, 0.011, 0.0105, 0.0095];
    for (let i = 0; i < 4; i++) {
      g.lineCap = 'round'; g.strokeStyle = i % 2 ? MAN.skin : '#bb8f71'; g.lineWidth = fw[i] * 2 * s;
      g.beginPath(); g.moveTo(...X(0.02, fy[i])); g.quadraticCurveTo(...X(-fl[i] * 0.5, fy[i] + 0.002), ...X(-fl[i], fy[i] - 0.004)); g.stroke();
    }
    // thumb, tucked along the lower edge of the hand
    g.strokeStyle = MAN.skinShade; g.lineWidth = 0.011 * 2 * s;
    g.beginPath(); g.moveTo(...X(0.09, -0.045)); g.quadraticCurveTo(...X(0.07, -0.062), ...X(0.045, -0.06)); g.stroke();
    // knuckle shading
    g.fillStyle = MAN.skinShade + '77'; g.beginPath(); g.ellipse(...X(0.03, 0.0), 0.02 * s, 0.05 * s, 0, 0, TAU); g.fill();
    g.restore();
  }, { dark: 0.35, rims: [{ dir: [-0.2, -1], color: WARM, a: 0.85, w: 6 }, { dir: [1, 0.1], color: COOL_RIM, a: 0.25, w: 4 }], shade: { from: [0, H * 0.4], to: [0, H * 0.55], a: 0.2 } });
  // coat tail whipping round the corner in the foreground
  const sweep = inv(0.5, 1.0, lt);
  if (sweep > 0 && sweep < 1) {
    ctx.save(); ctx.fillStyle = MAN.coatShade; ctx.filter = 'blur(12px)';
    const x = lerp(W + 400, -400, easeIO(sweep));
    ctx.beginPath(); ctx.moveTo(x + 520, H); ctx.quadraticCurveTo(x + 120, H * 0.56, x - 380, H * 0.63); ctx.lineTo(x - 250, H); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

// ------------------------------------------------------------------ timeline
export const SHOTS = [
  { t0: 0.0, t1: 4.4, f: S1 },
  { t0: 4.4, t1: 7.0, f: S2 },
  { t0: 7.0, t1: 8.6, f: S3 },
  { t0: 8.6, t1: 11.6, f: S4 },
  { t0: 11.6, t1: 13.2, f: S5 },
  { t0: 13.2, t1: 15.4, f: S6 },
  { t0: 15.4, t1: 17.2, f: S7 },
  { t0: 17.2, t1: 18.75, f: S8 },
  { t0: 18.75, t1: 19.95, f: S9 },
  { t0: 19.95, t1: 22.2, f: S8 },
  ...ACT2, ...ACT3,
];
export const DURATION = SHOTS[SHOTS.length - 1].t1;

// ------------------------------------------------------------------ post: grade, vignette, grain, captions
const grainTiles = [];
function makeGrain() {
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); const img = g.createImageData(512, 512); const r = mulberry32(700 + k);
    for (let i = 0; i < img.data.length; i += 4) { const v = r(); const on = v > 0.5 ? 255 : 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = on; img.data[i + 3] = Math.abs(v - 0.5) * 2 * 255; }
    g.putImageData(img, 0, 0); grainTiles.push(c);
  }
}
function post(ctx, t) {
  // vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.22, W / 2, H * 0.5, H * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,3,6,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // grain
  const f = Math.floor(t * 24), r = mulberry32(f * 13 + 5);
  const tile = grainTiles[f % grainTiles.length];
  ctx.save(); ctx.globalAlpha = 0.07;
  const ox = -Math.floor(r() * 512), oy = -Math.floor(r() * 512);
  for (let y = oy; y < H; y += 512) for (let x = ox; x < W; x += 512) ctx.drawImage(tile, x, y);
  ctx.restore();
}

export const VO = [
  { t0: 53.2, t1: 55.6, text: 'Müşteriler sizden kaçmıyor…' },
  { t0: 57.0, t1: 59.9, text: 'Sadece sizi henüz bulamıyor.' },
  { t0: 69.0, t1: 71.8, text: 'Fentra ile dijital dünyada görünür olun.' },
  { t0: 73.8, t1: 78.6, text: 'Web, SEO ve dijital görünürlüğü\ntek bir yolculukta birleştirelim.' },
  { t0: 80.6, t1: 82.8, text: 'Markanızı birlikte büyütelim.' },
];
function captions(ctx, t) {
  for (const v of VO) {
    const a = win(t, v.t0 - 0.15, v.t0 + 0.35, v.t1 + 0.1, v.t1 + 0.55);
    if (a <= 0.001) continue;
    const lines = v.text.split('\n');
    const cy = 1430, lh = 66;
    ctx.save();
    // soft shadow band for legibility (no box)
    const band = ctx.createRadialGradient(W / 2, cy, 10, W / 2, cy, 520);
    band.addColorStop(0, `rgba(4,5,8,${0.42 * a})`); band.addColorStop(1, 'rgba(4,5,8,0)');
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(1, 0.32); ctx.translate(-W / 2, -cy); ctx.fillStyle = band; ctx.fillRect(0, cy - 520, W, 1040); ctx.restore();
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 500 52px "Playfair Display"'; ctx.fillStyle = '#f3ede4';
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 2;
    const rise = (1 - easeOut(inv(v.t0 - 0.15, v.t0 + 0.45, t))) * 10;
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, cy + (i - (lines.length - 1) / 2) * lh + rise));
    ctx.restore();
  }
}

// ------------------------------------------------------------------ cues for the sound design
function cues() {
  // his footfalls, shot by shot (each chase shot has its own story offset)
  const run = [];
  const runShots = [['S1', MAN_T0, 4.4], ['S2', 4.4, 7.0], ['S3', 7.0, 8.6], ['S4', 8.6, 11.6], ['S5', 11.6, 13.2], ['S8', 17.2, 19.95]];
  for (const [k, a, b] of runShots) {
    const st = STORY[k];
    for (const tf of footfalls(RUN, -5, 60)) { const tt = st.t0 + tf - st.man / V; if (tt >= a && tt < b) run.push(tt); }
  }
  // the pursuers (five people, loose cadence), wherever they are on screen or just behind
  const group = [];
  const grpShots = [['S2', 4.4, 7.0], ['S6', 13.2, 15.4], ['S7', 15.4, 17.2], ['S8', 17.2, 22.2]];
  for (const [k, a, b] of grpShots) {
    const st = STORY[k];
    for (const g of GROUP) for (const tf of footfalls({ ...RUN, phase: g.phase }, -5, 60)) { const tt = st.t0 + tf - (st.grp - g.lag) / V; if (tt >= a && tt < b) group.push(tt); }
  }
  return { run: run.sort((a, b) => a - b), group: group.sort((a, b) => a - b), ...(window.EXTRA_CUES || {}), vo: VO, duration: DURATION };
}

export async function boot(canvas) {
  const ctx = canvas.getContext('2d');
  makeGrain();
  initAct3();
  await document.fonts.load('300 46px "Inter Tight"', 'Müşteriler sizden kaçmıyor… ğüşıöçİ');
  for (const fnt of ['italic 500 52px "Playfair Display"', 'italic 400 42px "Playfair Display"', '500 66px "Playfair Display"', '600 36px "Manrope"', '500 26px "Manrope"', '400 27px "Manrope"']) await document.fonts.load(fnt, 'Müşteriler sizden kaçmıyor… ğüşıöçİ Dijitalde görünür @fentra.digital WEB SEO GEO');
  await document.fonts.load('400 30px "Inter Tight"', 'Yeni müşteri talebi');
  await document.fonts.load('500 30px "Inter Tight"', 'Web • SEO • GEO');
  const logo = new Image(); logo.src = '../assets/fentra-logo.png'; await logo.decode();
  window.FENTRA_LOGO = logo;
  window.FILM = { duration: DURATION, cues };
  window.renderAt = (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    const sh = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    sh.f(ctx, t, sh);
    if (!sh.noPost) post(ctx, t);
    captions(ctx, t);
    // global fades (open from black)
    const fin = 1 - sstep(0, 0.8, t);
    if (fin > 0) { ctx.fillStyle = `rgba(0,0,0,${fin})`; ctx.fillRect(0, 0, W, H); }
    return true;
  };
}
