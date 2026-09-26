// Act 2 — the dead end, the flashlights, the reveal.
import { W, H, clamp, lerp, inv, sstep, easeIO, easeOut, easeIn, win, lerp3, TAU, mulberry32, hex, rgb, Cam, figure, castShadow, glow, softDisc, beam, scratch, peek } from './engine.js';
import { MAN, CUSTOMERS, RUN, manFront, manBack, personFront, personBack, faceFront, hatFront, tr } from './characters.js';
import { renderWorld, groundPool } from './world.js';
import { actorT, makePath, contactShadow } from './common.js';

const cam = new Cam();
const WARM = hex('#ffb866');
const TORCH = hex('#fff0d8');
const COOL_RIM = hex('#9fb4d6');
const V = RUN.v;

export const MAN_STOP = [19.25, 0, -59.2];
const WALL_Z = -62;
// Final line-up across the alley (lamp, plan, phone, box, folder), east → west.
export const LINE = [[20.1, -52.5], [19.62, -52.05], [19.15, -52.6], [18.7, -52.1], [18.28, -52.5]];
const ENTER = [ // side each customer steps in from (x at start) and the time they appear
  { x0: 21.9, t: 30.9 }, { x0: 21.8, t: 31.5 }, { x0: 16.6, t: 32.1 }, { x0: 21.9, t: 32.7 }, { x0: 16.5, t: 33.3 },
];
export const CLICKS = [35.7, 36.15, 36.55, 36.95, 37.35];

// Where each customer is at time t (act 2 onwards).
export function custPos(i, t) {
  const L = LINE[i], e = ENTER[i];
  const a = easeIO(inv(e.t, e.t + 1.0, t));
  let x = lerp(e.x0, L[0], a), z = lerp(-48.3, -49.7, a);
  const f = easeIO(inv(33.9 + i * 0.08, 35.0 + i * 0.08, t));
  z = lerp(z, L[1], f);
  const moving = (t > e.t && t < e.t + 1.0) || (t > 33.9 && t < 35.1);
  return { p: [x, 0, z], walk: moving ? t * 1.9 + i * 0.3 : undefined, visible: t > e.t - 0.1 };
}

// ---------------------------------------------------------------- S10: into the dead end, he slows and stops
const P10 = makePath([[11.5, 0, -47.6], [18.9, 0, -47.6], [19.3, 0, -50.5], MAN_STOP]);
const S10_T0 = 22.2, S10_S0 = 8.0, DEC_D = 5.0;
function s10(lt) {
  const sDec = P10.L - DEC_D, t1 = (sDec - S10_S0) / V, Td = (2 * DEC_D) / V;
  if (lt < t1) return { s: S10_S0 + V * lt, v: V };
  const u = Math.min(lt - t1, Td);
  return { s: sDec + V * u - (V / (2 * Td)) * u * u, v: Math.max(0, V - (V / Td) * u) };
}
export const STOP_T = S10_T0 + (P10.L - DEC_D - S10_S0) / V + (2 * DEC_D) / V;
function breath(t) { const k = sstep(STOP_T - 0.4, STOP_T + 0.4, t) * (1 - 0.35 * sstep(STOP_T + 2, STOP_T + 9, t)); return k * Math.sin(TAU * 0.78 * (t - STOP_T)); }

function S10(ctx, t) {
  const lt = t - S10_T0;
  cam.set(lerp3([19.72, 1.28, -49.4], [19.62, 1.36, -50.6], easeIO(lt / 4.8)), [19.2, 1.95, -62], 46);
  const st = s10(lt);
  const at = P10.at(st.s);
  const amp = Math.sqrt(clamp(st.v / V));
  const actors = [{
    pos: at.p, draw: (c) => {
      const T = actorT(cam, at.p);
      if (T.d < 0.25) return;
      contactShadow(c, cam, at.p, 0.35, 0.55);
      const near = clamp(1.6 - T.d);
      const ds = t - STOP_T, leanF = ds > -0.6 ? (ds < 0 ? (ds + 0.6) / 0.6 * 0.6 : 0.6 * Math.exp(-ds * 2.6) * Math.cos(ds * 7.5)) : 0;
      figure(c, (g) => manBack(g, T, amp > 0.02 ? { phase: st.s / (V * RUN.T), amp, hunch: 0.2, leanF } : { breath: breath(t), hunch: 0.35, leanF }), {
        rims: [{ dir: [0.6, -1], color: WARM, a: 0.5, w: Math.max(2, T.s * 0.02) }], shade: { from: [0, T.oy - T.s * 1.8], to: [0, T.oy], a: 0.35 }, blur: near > 0 ? near * 14 : 0,
      });
    },
  }];
  renderWorld(ctx, cam, { actors });
}

// ---------------------------------------------------------------- S11: facing the wall — push in, nowhere to go
function S11(ctx, t) {
  const lt = t - 27.0;
  cam.set(lerp3([19.25, 1.6, -61.55], [19.25, 1.64, -60.55], easeIO(lt / 3.4)), [19.25, 1.58, -58], 34);
  const b = breath(t);
  const lookUp = win(lt, 0.45, 0.8, 1.2, 1.45), left = win(lt, 1.3, 1.45, 1.75, 1.9), right = win(lt, 1.85, 2.0, 2.3, 2.45);
  const turn = sstep(2.85, 3.4, lt);
  const expr = {
    yaw: -turn * 0.42, gazeX: -left + right - turn * 0.8, gazeY: lookUp * 1.2, brow: 0.8 + lookUp * 0.5 + sstep(2.3, 2.7, lt) * 0.4, knit: 0.5,
    open: 0.12 + Math.max(0, b) * 0.2, eyeL: 1, eyeR: 1,
  };
  const actors = [{
    pos: MAN_STOP, draw: (c) => {
      const T = actorT(cam, MAN_STOP);
      figure(c, (g) => manFront(g, T, { breath: b, head: expr, lightSide: -1 }), {
        rims: [{ dir: [-1, -0.5], color: WARM, a: 0.55, w: T.s * 0.012 }, { dir: [1, -0.3], color: COOL_RIM, a: 0.2, w: T.s * 0.008 }],
        shade: { from: [T.ox - T.s * 0.3, 0], to: [T.ox + T.s * 0.35, 0], a: 0.35 },
      });
    },
  }];
  renderWorld(ctx, cam, { actors });
  const [bc, bg] = scratch(5); bg.drawImage(ctx.canvas, 0, 0);
  ctx.save(); ctx.filter = 'blur(6px)'; ctx.globalAlpha = 0.6; ctx.drawImage(bc, 0, 0); ctx.restore();
  // redraw him sharp over the softened alley
  actors[0].draw(ctx);
}

// ---------------------------------------------------------------- customers as figures in the world
function drawCustomer(c, cam, i, t, opts) {
  const cp = opts.pos || custPos(i, t);
  if (!cp.visible && !opts.pos) return null;
  const T = actorT(cam, cp.p, 1);
  if (T.d < 0.3) return null;
  let fl = null;
  contactShadow(c, cam, cp.p, 0.3, 0.5);
  figure(c, (g) => { const r = personFront(g, T, CUSTOMERS[i], { walk: cp.walk, ...opts.pose }); fl = r.flashlight; }, opts.look || {});
  return { T, fl };
}

// ---------------------------------------------------------------- S12: over his shoulder — silhouettes fill the exit
function S12(ctx, t) {
  const lt = t - 30.4;
  cam.set(lerp3([19.95, 1.8, -61.25], [19.9, 1.78, -61.05], lt / 4.8), [19.0, 1.4, -50.5], 38);
  const actors = [];
  for (let i = 0; i < 5; i++) {
    const cp = custPos(i, t);
    if (!cp.visible) continue;
    actors.push({ pos: cp.p, draw: (c) => drawCustomer(c, cam, i, t, { pose: { light: 'down', lightOn: 0, propUp: 0 }, look: { dark: 0.94, rims: [{ dir: [0, -1], color: WARM, a: 0.75, w: 3 }, { dir: [1, 0], color: WARM, a: 0.35, w: 2 }] } }) });
  }
  actors.push({ pos: MAN_STOP, bias: 0, draw: (c) => {
    const T = actorT(cam, MAN_STOP);
    figure(c, (g) => manBack(g, T, { breath: breath(t), hunch: 0.35 + 0.2 * sstep(31, 33.6, t) }), { dark: 0.45, rims: [{ dir: [-0.3, -1], color: WARM, a: 0.45, w: 6 }], blur: 3 });
  } });
  renderWorld(ctx, cam, { actors });
}

// ---------------------------------------------------------------- S13: click, click, click — the torches come on
function torchOn(i, t) { return sstep(CLICKS[i], CLICKS[i] + 0.06, t); }
function S13(ctx, t) {
  const lt = t - 35.2;
  cam.set(lerp3([19.92, 1.76, -61.1], [19.9, 1.74, -60.9], lt / 3.0), [19.15, 1.35, -52.3], 32);
  const lenses = [];
  const actors = [];
  for (let i = 0; i < 5; i++) {
    actors.push({ pos: custPos(i, t).p, draw: (c) => {
      const r = drawCustomer(c, cam, i, t, { pose: { light: 'up', aim: sstep(35.2 + i * 0.1, 35.55 + i * 0.1, t), lightOn: torchOn(i, t), propUp: 0 }, look: { dark: 0.94, rims: [{ dir: [0, -1], color: WARM, a: 0.7, w: 3 }] } });
      if (r && r.fl) lenses.push({ ...r.fl, on: torchOn(i, t), i });
    } });
  }
  const on = CLICKS.reduce((a, c, i) => a + torchOn(i, t), 0) / 5;
  actors.push({ pos: MAN_STOP, draw: (c) => {
    const T = actorT(cam, MAN_STOP);
    figure(c, (g) => manBack(g, T, { breath: breath(t) * (1 - on * 0.5), hunch: 0.55 }), {
      dark: 0.5 - on * 0.3, rims: [{ dir: [-0.3, -1], color: TORCH, a: 0.3 + on * 0.5, w: 7 }],
      spots: [{ x: T.ox, y: T.oy - T.s * 1.3, r: T.s * 0.7, color: [255, 238, 210], a: on * 0.35 }], blur: 3,
    });
  } });
  renderWorld(ctx, cam, { actors, lampGain: 1 - on * 0.3 });
  // torches: lens flare + beam through the haze toward us
  for (const L of lenses) {
    if (L.on <= 0) continue;
    const flick = 1 + 0.03 * Math.sin(t * 37 + L.i);
    beam(ctx, L.lens, [W * 0.5 + (L.lens[0] - W * 0.5) * 2.4, H * 0.55], 6, 260, TORCH, 0.16 * L.on);
    glow(ctx, L.lens[0], L.lens[1], 180 * flick, TORCH, 0.5 * L.on);
    glow(ctx, L.lens[0], L.lens[1], 34, [255, 255, 255], 0.95 * L.on);
    // anamorphic-free, restrained horizontal streak
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 * L.on; ctx.fillStyle = rgb(TORCH);
    ctx.filter = 'blur(6px)'; ctx.fillRect(L.lens[0] - 150, L.lens[1] - 2, 300, 4); ctx.restore();
  }
}

// ---------------------------------------------------------------- S14: reverse — beams converge, he hides in his coat
function manLitFront(ctx, cam, t, pose, beams) {
  const T = actorT(cam, MAN_STOP);
  const center = [MAN_STOP[0], 1.15, MAN_STOP[2]];
  const P = cam.project(center);
  figure(ctx, (g) => manFront(g, T, pose), {
    rims: [{ dir: [0, -1], color: TORCH, a: 0.4, w: T.s * 0.01 }],
    spots: [{ x: T.ox, y: T.oy - T.s * 1.35, r: T.s * 0.7, color: [255, 228, 195], a: 0.32 * beams }, { x: T.ox, y: T.oy - T.s * 0.7, r: T.s * 0.8, color: [255, 224, 190], a: 0.2 * beams }],
    before: (sil) => {
      // his shadows on the brick wall — one per torch, magnified by distance
      if (beams <= 0) return;
      const wallTop = cam.project([MAN_STOP[0], 6.4, WALL_Z]), wallBot = cam.project([MAN_STOP[0], 0, WALL_Z]);
      ctx.save(); ctx.beginPath(); ctx.rect(0, wallTop[1], W, wallBot[1] - wallTop[1]); ctx.clip();
      for (let i = 0; i < 5; i++) {
        const src = torchWorld(i);
        const k = (WALL_Z - src[2]) / (center[2] - src[2]);
        const wp = [src[0] + (center[0] - src[0]) * k, src[1] + (center[1] - src[1]) * k, WALL_Z];
        const Wp = cam.project(wp);
        const ks = k * (cam.depth(center) / cam.depth(wp));
        castShadow(ctx, sil, [ks, 0, 0, ks, Wp[0] - ks * P[0], Wp[1] - ks * P[1]], 0.32 * beams, 5);
      }
      ctx.restore();
    },
  });
}
function torchWorld(i) { const L = LINE[i]; return [L[0] - 0.12, 1.32, L[1] - 0.4]; }

function S14(ctx, t) {
  const lt = t - 38.2;
  cam.set(lerp3([19.35, 2.45, -49.9], [19.35, 2.4, -50.35], lt / 3.4), [19.25, 1.15, -59.2], 40);
  const flinch = sstep(0.25, 0.4, lt), hide = easeIO(inv(0.75, 1.55, lt)), peek2 = win(lt, 2.55, 2.75, 3.0, 3.2);
  const pose = {
    crouch: hide * 0.55 + flinch * 0.05, cover: hide,
    head: { squint: flinch * 0.8 * (1 - hide * 0.4), brow: 1.2, knit: 0.6, eyeL: 1 - flinch * 0.3, eyeR: 1 - flinch * 0.3, gazeX: peek2 * 0.9 - win(lt, 2.1, 2.3, 2.45, 2.6) * 0.9, open: flinch * 0.25 * (1 - hide) },
    lightSide: 1,
  };
  // wall pools where the beams land
  const after = (c) => {};
  const actors = [];
  actors.push({ pos: MAN_STOP, draw: (c) => {
    for (let i = 0; i < 5; i++) {
      const src = torchWorld(i), center = [MAN_STOP[0], 1.15, MAN_STOP[2]];
      const k = (WALL_Z - src[2]) / (center[2] - src[2]);
      const wp = cam.project([src[0] + (center[0] - src[0]) * k, src[1] + (center[1] - src[1]) * k, WALL_Z]);
      softDisc(c, wp[0], wp[1], cam.scaleAt([19.25, 1, WALL_Z]) * 1.2, cam.scaleAt([19.25, 1, WALL_Z]) * 1.35, TORCH, 0.2);
    }
    groundPool(c, cam, [19.25, 0.01, -58.6], 1.8, TORCH, 0.35);
    manLitFront(c, cam, t, pose, 1);
  } });
  // foreground silhouettes (back view), torches raised toward him
  for (const i of [1, 3, 0, 2, 4]) {
    const L = LINE[i];
    actors.push({ pos: [L[0], 0, L[1]], draw: (c) => {
      const T = actorT(cam, [L[0], 0, L[1]], 1);
      if (T.d < 0.3) return;
      figure(c, (g) => personBack(g, T, CUSTOMERS[i], 1), { dark: 0.9, rims: [{ dir: [0, -1], color: TORCH, a: 0.25, w: 4 }] });
    } });
  }
  renderWorld(ctx, cam, { actors, lampGain: 0.6 });
  // beams through the haze, from each lens to him
  for (let i = 0; i < 5; i++) {
    const a = cam.project(torchWorld(i)), b = cam.project([MAN_STOP[0] + (i - 2) * 0.08, 1.25, MAN_STOP[2]]);
    if (a[2] <= 0.1) continue;
    beam(ctx, a, b, 5, cam.scaleAt([19.25, 1.2, -59.2]) * 0.55, TORCH, 0.2);
    glow(ctx, a[0], a[1], 60, TORCH, 0.5);
  }
}

// ---------------------------------------------------------------- S15: hiding inside the coat (comic beat)
function S15(ctx, t) {
  const lt = t - 41.6;
  cam.set([19.25, 1.6, -57.75], [19.25, 1.52, -59.2], 38);
  const dart = win(lt, 0.5, 0.62, 0.95, 1.05) - win(lt, 1.15, 1.27, 1.6, 1.7);
  const pose = { crouch: 0.55, cover: 1, head: { brow: 1.3, knit: 0.5, gazeX: dart * 1.0, gazeY: 0.1, squint: 0.2 }, lightSide: 1 };
  const actors = [{ pos: MAN_STOP, draw: (c) => {
    groundPool(c, cam, [19.25, 0.01, -58.6], 1.8, TORCH, 0.35);
    const T = actorT(cam, MAN_STOP);
    T.ox += Math.sin(t * 31) * 0.8; // tiny shiver
    figure(c, (g) => manFront(g, T, pose), { spots: [{ x: T.ox, y: T.oy - T.s * 1.45, r: T.s * 0.55, color: [255, 226, 190], a: 0.28 }, { x: T.ox - T.s * 0.2, y: T.oy - T.s * 1.1, r: T.s * 0.8, color: [255, 222, 185], a: 0.14 }], rims: [{ dir: [0, -1], color: TORCH, a: 0.35, w: 8 }], shade: { from: [0, T.oy - T.s * 1.3], to: [0, T.oy - T.s * 0.6], a: 0.3 } });
  } }];
  renderWorld(ctx, cam, { actors, lampGain: 0.6 });
  for (let i = 0; i < 5; i++) softDisc(ctx, W * (0.2 + i * 0.15), H * (0.35 + (i % 2) * 0.1), 420, 480, TORCH, 0.035);
}

// ---------------------------------------------------------------- S16: the reveal — a slow dolly along the line of customers
const REVEAL = [
  { k: 0.5, expr: { brow: 0.7, smile: 0.35 } },
  { k: 1.95, expr: { brow: 0.55, knit: 0.45, smile: 0.12 } },
  { k: 3.4, expr: { brow: 0.35, smile: 0.25 } },
  { k: 4.85, expr: { knit: 0.7, brow: -0.1, smile: -0.05 } },
  { k: 6.3, expr: { brow: 0.75, smile: 0.3 } },
];
function S16(ctx, t) {
  const lt = t - 43.8;
  // stepped dolly: glide, settle on each person, glide on
  const keys = [[0, 20.28], [0.9, 20.12], [1.45, 19.64], [2.35, 19.62], [2.9, 19.17], [3.8, 19.15], [4.35, 18.72], [5.25, 18.7], [5.8, 18.3], [7.2, 18.27]];
  let x = keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) if (lt < keys[i + 1][0]) { x = lerp(keys[i][1], keys[i + 1][1], easeIO(inv(keys[i][0], keys[i + 1][0], lt))); break; }
  cam.set([x, 1.42, -55.1], [x, 1.3, -52.3], 30);
  const actors = [];
  for (let i = 0; i < 5; i++) {
    const L = LINE[i];
    const up = sstep(REVEAL[i].k - 0.55, REVEAL[i].k + 0.1, lt);
    actors.push({ pos: [L[0], 0, L[1]], draw: (c) => {
      groundPool(c, cam, [L[0] - 0.1, 0.01, L[1] - 0.25], 0.55, TORCH, 0.35);
      drawCustomer(c, cam, i, t, { pos: { p: [L[0], 0, L[1]], visible: true }, pose: { light: 'down', lightOn: 1, propUp: 0.25 + 0.75 * up, screen: up, expr: { ...REVEAL[i].expr, gazeX: (x - L[0]) * 0.6 }, lightSide: 1 },
        look: { rims: [{ dir: [0, -1], color: WARM, a: 0.55, w: 4 }], spots: [{ x: W / 2, y: H * 0.62, r: 900, color: [255, 230, 200], a: 0.12 }], shade: { from: [0, H * 0.3], to: [0, H * 0.05], a: 0.3 } } });
    } });
  }
  renderWorld(ctx, cam, { actors, lampGain: 0.9 });
}

// ---------------------------------------------------------------- S17: he lowers the coat — objects, people, objects… customers
function S17(ctx, t) {
  const lt = t - 51.0;
  cam.set(lerp3([19.25, 1.5, -56.3], [19.25, 1.52, -56.9], easeIO(lt / 5)), [19.25, 1.32, -59.2], 34);
  const lower = easeIO(inv(0.2, 1.4, lt));
  const g1 = win(lt, 1.6, 1.8, 2.2, 2.4), g2 = win(lt, 2.3, 2.5, 2.9, 3.1), g3 = win(lt, 3.0, 3.2, 3.55, 3.7);
  const real = sstep(3.7, 4.2, lt);
  const pose = {
    crouch: 0.55 * (1 - lower), cover: 1 - lower,
    head: { brow: lerp(1.2, 0.4, lower) + real * 0.6, knit: 0.5 * (1 - real), gazeY: -g1 * 0.9 - g3 * 0.9 + g2 * 0.3, gazeX: -g1 * 0.6 + g3 * 0.6, tilt: real * 0.06, open: real * 0.12, eyeL: 1, eyeR: 1 },
    lightSide: 1, breath: Math.sin(TAU * 0.5 * lt) * 0.3,
  };
  const actors = [{ pos: MAN_STOP, draw: (c) => {
    groundPool(c, cam, [19.25, 0.01, -58.4], 1.6, TORCH, 0.22);
    manLitFront(c, cam, t, pose, 0.45);
  } }];
  renderWorld(ctx, cam, { actors, lampGain: 0.8 });
}

// ---------------------------------------------------------------- S18: wide — needs held out, torches lowered
function S18(ctx, t) {
  const lt = t - 56.0;
  cam.set(lerp3([20.25, 2.15, -61.6], [20.2, 2.1, -61.4], lt / 4.6), [18.95, 1.1, -54.0], 50);
  const step = easeIO(inv(1.5, 2.3, lt));
  const mp = [MAN_STOP[0], 0, MAN_STOP[2] + step * 0.4];
  const actors = [];
  for (let i = 0; i < 5; i++) {
    const L = LINE[i];
    actors.push({ pos: [L[0], 0, L[1]], draw: (c) => {
      groundPool(c, cam, [L[0] - 0.1, 0.01, L[1] - 0.25], 0.6, TORCH, 0.4);
      drawCustomer(c, cam, i, t, { pos: { p: [L[0], 0, L[1]], visible: true }, pose: { light: 'down', lightOn: 1, propUp: 1, expr: { ...REVEAL[i].expr, smile: (REVEAL[i].expr.smile || 0) + 0.15 * sstep(2, 3, lt) }, lightSide: 1 }, look: { rims: [{ dir: [0, -1], color: WARM, a: 0.5, w: 3 }] } });
    } });
  }
  actors.push({ pos: mp, draw: (c) => {
    const T = actorT(cam, mp);
    contactShadow(c, cam, mp, 0.35, 0.5);
    figure(c, (g) => manBack(g, T, { breath: 0.2 * Math.sin(TAU * 0.4 * lt), phase: step > 0 && step < 1 ? step * 0.5 : null, amp: 0.3 }), { dark: 0.3, rims: [{ dir: [0, -1], color: TORCH, a: 0.35, w: 6 }] });
  } });
  renderWorld(ctx, cam, { actors, lampGain: 0.9 });
}

export const ACT2 = [
  { t0: 22.2, t1: 27.0, f: S10, shake: 0.35 },
  { t0: 27.0, t1: 30.4, f: S11 },
  { t0: 30.4, t1: 35.2, f: S12 },
  { t0: 35.2, t1: 38.2, f: S13, bloom: 1.4 },
  { t0: 38.2, t1: 41.6, f: S14, bloom: 1.3, shake: 0.25 },
  { t0: 41.6, t1: 43.8, f: S15 },
  { t0: 43.8, t1: 51.0, f: S16 },
  { t0: 51.0, t1: 56.0, f: S17 },
  { t0: 56.0, t1: 60.6, f: S18 },
];
// footfalls while he decelerates into the dead end (each foot = half a stride cycle)
const decel = [];
{ let prev = null; for (let lt = 0; lt < STOP_T - S10_T0 + 0.05; lt += 1 / 480) { const c = Math.floor(s10(lt).s / (V * RUN.T) * 2); if (prev !== null && c !== prev) decel.push(S10_T0 + lt); prev = c; } }
const arrive = [];
for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) arrive.push(ENTER[i].t + 0.15 + k * 0.29);
for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) arrive.push(33.95 + i * 0.08 + k * 0.33);
window.EXTRA_CUES = { clicks: CLICKS, stop: STOP_T, decel, arrive: arrive.sort((a, b) => a - b), appear: ENTER.map((e) => e.t) };
