// Fentra Digital Studio — "Görünmeyen Dükkân" (The Invisible Shop). Deterministic: each frame is a pure function of t.
// Every shot is a camera on one continuous world, so people, cars and the street stay consistent across cuts.
import { W, H, TAU, clamp, lerp, inv, sstep, easeIO, easeO, easeI, sine, quint, win, mulberry32, noise1, hex, rgb, mix, PAL, Cam, scratch, grainTile, line } from './core.js';
import { drawSky, drawFar, drawFacades, drawGround, streetProps, drawSunAndShade, setDoorOpen, HS, TRACE, LW, GH } from './street.js';
import { drawPerson, seatedPose, finishPose } from './people.js';
import { simulate, locoPose, FIELDS } from './gait.js';
import { drawCar, drawMoped } from './vehicles.js';

export const DUR = 29.5;
const PI = Math.PI;

// ================================================================== timeline (seconds)
export const T = {
  cut1: 5.0, cut2: 7.6, cut3: 10.45,
  crane0: 10.45, crane1: 12.25,
  sigOn: 11.45, desc0: 12.35, touch: 14.95,
  trace1: 16.25, frame0: 15.6, frame1: 16.7, sign0: 16.3, sign1: 17.3, awn0: 16.8, awn1: 17.9,
  glass0: 17.1, glass1: 17.9, lights0: 17.55, lights1: 18.5, props0: 17.9, props1: 18.8,
  pull0: 19.0, pull1: 25.5, brand0: 25.5, logo: 26.25, slogan: 26.95, services: 27.55, handle: 28.05,
};
export const CAPTIONS = [
  { t0: 5.55, t1: 10.4, text: 'Müşteri sizi göremiyorsa…', slot: 0 },
  { t0: 9.0, t1: 10.4, text: '…sizi seçemez.', slot: 1 },
  { t0: 20.8, t1: 25.2, text: 'Fentra ile dijital dünyada\ngörünür olun.', slot: 0 },
];

// ================================================================== camera
const K = (t, keys) => {
  // keys: [t, {x,y,z,f,hy}, ease] — eased piecewise interpolation
  if (t <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b, e] = keys[i + 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0), w = (e || easeIO)(u);
      const o = {}; for (const k of Object.keys(a)) o[k] = lerp(a[k], b[k] ?? a[k], w); return o;
    }
  }
  return { ...keys[keys.length - 1][1] };
};
const SHOT1 = [[0, { x: -7.4, y: 3.2, z: 17.5, f: 1000, hy: 0.665 * H }], [T.cut1, { x: -1.5, y: 3.0, z: 16.8, f: 1000, hy: 0.66 * H }, (u) => sine(u * 0.5 + 0.5) * 2 - 1]];
const SHOT2 = [[T.cut1, { x: -0.55, y: 1.55, z: 9.3, f: 1150, hy: 0.66 * H }], [T.cut2, { x: -0.35, y: 1.55, z: 9.0, f: 1150, hy: 0.66 * H }, (u) => u]];
const SHOT3 = [
  [T.cut2, { x: 0.78, y: 1.4, z: 5.0, f: 1150, hy: 0.49 * H }],
  [T.cut3, { x: 0.64, y: 1.45, z: 4.75, f: 1150, hy: 0.49 * H }, (u) => u * (1.15 - 0.15 * u)],
];
// the building, from the street up into the light; then the push-in with the signal, the reveal and the pull-back
const SHOT4 = [
  [T.cut3, { x: 0.0, y: 4.6, z: 16.0, f: 1150, hy: 0.76 * H }],
  [T.crane1, { x: 0.0, y: 8.6, z: 15.6, f: 1150, hy: 0.69 * H }, (u) => sine(u * 0.8 + 0.2) / sine(1) * 1 - sine(0.2) * (1 - u)],
  [T.desc0, { x: 0.0, y: 8.9, z: 15.5, f: 1150, hy: 0.685 * H }, (u) => u],
  [T.touch, { x: 0.0, y: 2.0, z: 9.3, f: 1150, hy: 0.555 * H }, (u) => easeIO(u) * 0.85 + 0.15 * sine(u)],
  [T.pull0, { x: 0.0, y: 1.9, z: 6.95, f: 1150, hy: 0.54 * H }, sine],
  [T.pull1, { x: 0.95, y: 2.1, z: 11.6, f: 1080, hy: 0.628 * H }, easeIO],
  [DUR, { x: 1.05, y: 2.15, z: 12.2, f: 1080, hy: 0.628 * H }, (u) => u],
];
export function camAt(t) {
  const c = t < T.cut1 ? K(t, SHOT1) : t < T.cut2 ? K(t, SHOT2) : t < T.cut3 ? K(t, SHOT3) : K(t, SHOT4);
  return new Cam(c);
}
export const shotOf = (t) => (t < T.cut1 ? 0 : t < T.cut2 ? 1 : t < T.cut3 ? 2 : 3);

// ================================================================== cast
const P_ = (o) => ({ build: 1, fem: false, legs: null, scarf: null, bag: null, prop: null, propSide: 'R', hat: null, seed: 0, ...o });
const CAST = {
  sitter: P_({ h: 1.66, fem: true, skin: '#E2B99A', hair: { style: 'bun', color: '#3B2E28' }, top: { color: '#E6DED0', collar: '#D8CDBB' }, bottom: { color: '#4A5160', style: 'trousers' }, shoes: '#6B4F3E', seed: 1 }),
  coffee: P_({ h: 1.8, skin: '#D9A987', hair: { style: 'crop', color: '#2E2723' }, top: { color: '#B8946C', style: 'coat' }, bottom: { color: '#3C4049', cuff: true }, shoes: '#4A3A30', scarf: '#5F7C74', prop: 'coffee', propSide: 'R', seed: 2 }),
  florist: P_({ h: 1.63, fem: true, skin: '#8C6049', hair: { style: 'bob', color: '#1A1614' }, top: { color: '#E5D9C3' }, bottom: { color: '#6E7B6B', style: 'skirt' }, legs: '#8C6049', shoes: '#3A302A', seed: 3 }),
  her: P_({ h: 1.68, fem: true, skin: '#F0CDB3', hair: { style: 'long', color: '#8A6246' }, top: { color: '#7C8FA6', collar: '#E9E2D4' }, bottom: { color: '#2F3440', style: 'skirt' }, legs: '#3A3A40', shoes: '#2B2B2E', bag: { type: 'tote', color: '#C8A27A', side: 'L' }, seed: 4 }),
  him: P_({ h: 1.82, skin: '#C68F6B', hair: { style: 'short', color: '#1F1B19' }, top: { color: '#5F665A' }, bottom: { color: '#C9C0AE', cuff: true }, shoes: '#EDE8DF', seed: 5 }),
  seeker: P_({ h: 1.7, fem: true, skin: '#EAC0A2', hair: { style: 'pony', color: '#2B211D' }, top: { color: '#B8735A', style: 'coat' }, bottom: { color: '#2D3038' }, shoes: '#E8E2D6', bag: { type: 'cross', color: '#3A3534', side: 'L' }, prop: 'phone', seed: 6 }),
  browser: P_({ h: 1.72, fem: true, skin: '#F1D1BA', hair: { style: 'long', color: '#C9A574' }, top: { color: '#5B6573', style: 'coat' }, bottom: { color: '#2A2D33' }, shoes: '#2A2A2A', bag: { type: 'tote', color: '#E4DACB', side: 'R' }, seed: 7 }),
  first: P_({ h: 1.78, skin: '#E0B08E', hair: { style: 'short', color: '#5A4432' }, top: { color: '#8E959C', collar: '#DAD5CC' }, bottom: { color: '#2F3440' }, shoes: '#5C4432', bag: { type: 'cross', color: '#6A5140', side: 'R' }, seed: 8 }),
  second: P_({ h: 1.65, fem: true, skin: '#D8A98A', hair: { style: 'bun', color: '#6B4A35' }, top: { color: '#7A8C7E', style: 'coat' }, bottom: { color: '#3B3E46' }, shoes: '#3B3432', prop: 'bagHand', propSide: 'R', bagColor: '#EDE6DA', seed: 9 }),
  cap: P_({ h: 1.84, skin: '#7A523E', hair: { style: 'short', color: '#141212' }, hat: 'cap', hatColor: '#3C4A63', top: { color: '#D6CFC2' }, bottom: { color: '#44505E' }, shoes: '#EEE9E0', prop: 'phone', seed: 10 }),
  camel: P_({ h: 1.69, fem: true, skin: '#EFCFB6', hair: { style: 'bob', color: '#3A2A22' }, top: { color: '#A57F62', style: 'coat' }, bottom: { color: '#34363C' }, shoes: '#1F1F22', scarf: '#E7DDCC', seed: 11 }),
  pack: P_({ h: 1.76, skin: '#D4A07C', hair: { style: 'short', color: '#3A2B22' }, hat: 'beanie', hatColor: '#9C6B55', top: { color: '#3E4A44' }, bottom: { color: '#9A8F7E', cuff: true }, shoes: '#3A302A', bag: { type: 'backpack', color: '#8A7D6C' }, seed: 12 }),
  exit: P_({ h: 1.6, fem: true, skin: '#E7C3A6', hair: { style: 'crop', color: '#CFCBC6' }, top: { color: '#8C6F7A', style: 'coat' }, bottom: { color: '#3A3A40' }, shoes: '#4A3F3A', prop: 'bagHand', propSide: 'R', bagColor: '#F1EBDF', bagMark: '#24324D', seed: 13 }),
};

// ------------------------------------------------------------------ keyed values
const kv = (keys, t) => {
  if (!keys || !keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) return lerp(a, b, sine((t - t0) / (t1 - t0 || 1)));
  }
  return keys[keys.length - 1][1];
};
const EASE = { l: (u) => u, i: (u) => u * u * (2 - u), o: (u) => 1 - (1 - u) * (1 - u) * (1 + u), io: (u) => u * u * (3 - 2 * u) };
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };

class Actor {
  constructor(name, P, spec) {
    this.name = name; this.P = { ...P, propSide: spec.propSide || P.propSide }; this.spec = spec;
    this.keys = spec.keys;
    this.t0 = spec.keys[0].t; this.t1 = spec.keys[spec.keys.length - 1].t;
    this.falls = [];
    if (!spec.seated) this.sim = simulate(this);
  }
  posAt(t) {
    const k = this.keys;
    if (t <= k[0].t) return [k[0].p[0], k[0].p[1], -1];
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i], b = k[i + 1];
      if (t <= b.t) {
        const u = (t - a.t) / (b.t - a.t || 1), w = EASE[b.ease || 'l'](u);
        return [lerp(a.p[0], b.p[0], w), lerp(a.p[1], b.p[1], w), i];
      }
    }
    const L = k[k.length - 1]; return [L.p[0], L.p[1], k.length - 1];
  }
  segAt(t) { return this.posAt(t)[2]; }
  holdYaw(i) {
    // yaw for a hold: the yaw given on the key that starts/ends the hold
    const k = this.keys;
    for (let j = Math.min(i + 1, k.length - 1); j >= 0; j--) if (k[j].yaw != null) return k[j].yaw;
    return null;
  }
  sample(t) {
    const { tab, n, t0, NF } = this.sim;
    const f = clamp((t - t0) / (1 / 240), 0, n - 1.001), i = Math.floor(f), u = f - i;
    const o = i * NF, q = o + NF, out = {};
    for (const [key, j] of Object.entries(FIELDS)) out[key] = lerp(tab[o + j], tab[q + j], u);
    return out;
  }
  state(t) {
    const sp = this.spec, P = { ...this.P };
    if (sp.props) { let pr = P.prop; for (const [tt, v] of sp.props) if (t >= tt) pr = v; P.prop = pr; }
    const lookPhone = kv(sp.phone, t);
    let pose, x, z, yaw;
    if (sp.seated) {
      pose = seatedPose(P, t, { sip: kv(sp.sip, t) });
      ({ p: [x, z], yaw } = { p: this.keys[0].p, yaw: this.keys[0].yaw });
    } else {
      const S = this.sample(t);
      pose = finishPose(P, locoPose(P, S, t), t, { lookPhone });
      x = S.x; z = S.z; yaw = S.yaw;
    }
    const rel = kv(sp.head, t);
    const blinkT = (t * 0.33 + P.seed * 0.137) % 1;
    return {
      P, t, x, z, yaw, pose, headYaw: yaw + rel, headPitch: kv(sp.pitch, t),
      alpha: sp.alpha ? kv(sp.alpha, t) : 1, blink: blinkT < 0.035 && !sp.noBlink?.some(([a, b]) => t > a && t < b),
      expr: { smile: kv(sp.smile, t), brow: kv(sp.brow, t) }, door: sp.door,
    };
  }
}

// door openings (for walking in and out of shops)
const CAFE_DOOR = { x0: -4.72, x1: -3.72, h: 2.55 }, HERO_DOOR = { x0: -0.62, x1: 0.62, h: 2.52 };
const Q = [[0.98, 1.05], [1.74, 1.12], [2.5, 1.0], [3.27, 1.1], [4.02, 1.05], [4.78, 1.12]];

// Physically paced routes: accelerate from rest at ~1.1 m/s², cruise at a normal walking pace, brake at ~1.2 m/s².
// Appends dense keys to `keys` and returns the arrival time at each waypoint.
function route(keys, pts, { v = 1.3, rest0 = true, stop = true, yaw = null, acc = 1.1, dec = 1.2 } = {}) {
  const last = keys[keys.length - 1], T0 = last.t, path = [last.p, ...pts];
  const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const L = cum[cum.length - 1];
  let la = rest0 ? v * v / (2 * acc) : 0, ld = stop ? v * v / (2 * dec) : 0;
  if (la + ld > L) { const k = L / (la + ld); v *= Math.sqrt(k); la *= k; ld *= k; }
  const ta = rest0 ? v / acc : 0, tc = (L - la - ld) / v, td = stop ? v / dec : 0, dur = ta + tc + td;
  const sAt = (tau) => tau < ta ? 0.5 * acc * tau * tau : tau < ta + tc ? la + v * (tau - ta) : L - 0.5 * dec * Math.max(0, dur - tau) ** 2;
  const tAt = (sv) => sv < la ? Math.sqrt(2 * sv / acc) : sv <= L - ld ? ta + (sv - la) / v : dur - Math.sqrt(2 * Math.max(0, L - sv) / dec);
  const pAt = (sv) => { let i = 1; while (i < cum.length - 1 && sv > cum[i]) i++; const u = (sv - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [lerp(path[i - 1][0], path[i][0], u), lerp(path[i - 1][1], path[i][1], u)]; };
  for (let tau = 0.08; tau < dur; tau += 0.08) keys.push({ t: T0 + tau, p: pAt(sAt(tau)) });
  keys.push({ t: T0 + dur, p: path[path.length - 1], yaw });
  return cum.slice(1).map((sv) => T0 + tAt(sv));
}
const hold = (keys, t, yaw) => { const L = keys[keys.length - 1]; keys.push({ t, p: L.p, yaw: yaw ?? L.yaw }); return t; };
const r2 = (x) => Math.round(x * 100) / 100;

// the couple, heading into the café
const herK = [{ t: 0, p: [-12.2, 1.9] }];
const herT = route(herK, [[-4.72, 1.9], [-4.3, 0.9], [-4.22, -0.45]], { v: 1.25, rest0: false, stop: true });
const himK = [{ t: 0, p: [-12.85, 2.5] }];
const himT = route(himK, [[-4.98, 2.5], [-4.36, 0.95], [-4.22, -0.45]], { v: 1.25, rest0: false, stop: true });
// the woman looking for somewhere: she stops right in front of the invisible shop, chooses the café, and later comes back out
const seekK = [{ t: 0, p: [8.6, 2.2] }];
const seekStop = route(seekK, [[1.61, 2.02], [1.0, 1.85]], { v: 1.03, rest0: false, stop: true, yaw: 4.42 })[1];
const seekGo = hold(seekK, seekStop + 1.75, 4.42);
const seekIn = route(seekK, [[0.35, 1.87], [-4.05, 1.75], [-4.22, 0.5], [-4.22, -0.45]], { v: 1.3 });
const seekOut0 = hold(seekK, 20.7);
const seekOut = route(seekK, [[-4.15, 0.45], [-2.75, 1.2], [-2.05, 1.32]], { v: 1.2, yaw: -PI / 2 + 0.25 });
// the passer-by who notices first
const firstK = [{ t: 16.0, p: [-7.0, 2.4] }];
const firstStop = route(firstK, [[-2.15, 2.35], [-1.2, 2.25]], { v: 1.35, rest0: false, stop: true, yaw: -PI / 2 + 0.3 })[1];
const firstGo = hold(firstK, firstStop + 0.25);
const firstQ = route(firstK, [Q[0]], { v: 1.3, yaw: PI })[0];
// the second one: turns her head, slows, then follows
const secK = [{ t: 17.6, p: [7.8, 2.95] }];
const secStop = route(secK, [[4.3, 2.95], [3.25, 2.45]], { v: 1.3, rest0: false, stop: true, yaw: 4.2 })[1];
const secGo = hold(secK, Math.max(secStop + 0.3, firstGo + 0.9));
const secQ = route(secK, [Q[1]], { v: 1.15, yaw: PI })[0];
// the bookshop browser comes over
const browK = [{ t: 0, p: [5.4, 0.95], yaw: -PI / 2 }];
const browGo = hold(browK, 20.9, -PI / 2);
const browQ = route(browK, [Q[2]], { v: 1.2, yaw: PI })[0];
// people arriving along the street
const capK = [{ t: 18.8, p: [10.5, 2.25] }];
const capQ = route(capK, [[4.95, 2.25], Q[3]], { v: 1.35, rest0: false, yaw: PI })[1];
const camK = [{ t: 18.6, p: [11.3, 2.8] }];
const camQ = route(camK, [[5.55, 2.8], Q[4]], { v: 1.3, rest0: false, yaw: PI })[1];
const packK = [{ t: 20.4, p: [12.0, 3.05] }];
route(packK, [[6.35, 3.05], Q[5]], { v: 1.4, rest0: false, yaw: PI });
// a customer leaves the new shop with a bag
const exitK = [{ t: 21.9, p: [0.0, -0.55], yaw: PI / 2 }];
const exitGo = hold(exitK, 22.15, PI / 2);
const exitT = route(exitK, [[-0.15, 1.15], [-1.85, 2.35], [-9.9, 2.5]], { v: 1.2, stop: false });

export const STORY = { herT, himT, seekStop, seekGo, seekIn, seekOut, firstStop, firstGo, firstQ, secStop, secQ, browGo, browQ, capQ, camQ, exitGo };

const ACTORS = [
  new Actor('sitter', CAST.sitter, { keys: [{ t: 0, p: [-8.33, 1.2], yaw: PI }, { t: DUR, p: [-8.33, 1.2], yaw: PI }], seated: true, yaw0: PI,
    sip: [[0, 0], [1.4, 0], [2.0, 1], [3.1, 1], [3.7, 0], [22.2, 0], [22.8, 1], [23.9, 1], [24.5, 0]], head: [[0, 0.1], [4, 0.1], [4.6, 0.5], [7, 0.5], [7.6, 0.1]] }),
  new Actor('florist', CAST.florist, { keys: [{ t: 0, p: [-12.0, 1.5], yaw: -PI / 2 + 0.35 }, { t: DUR, p: [-12.0, 1.5], yaw: -PI / 2 + 0.35 }], yaw0: -PI / 2 + 0.35,
    head: [[0, -0.3], [2, 0.25], [3.5, 0.25], [4.5, -0.2]] }),
  new Actor('coffee', CAST.coffee, { keys: [{ t: 0, p: [4.3, 2.6] }, { t: 18, p: [4.3 - 1.35 * 18, 2.6] }], yaw0: PI, walk0: 1, phase0: 0.3 }),
  new Actor('her', CAST.her, { keys: herK, yaw0: 0, walk0: 1, phase0: 0.1, head: [[0, 0.6], [1.2, 0.6], [2.2, 0.0], [3.4, 0.7], [4.4, 0.0]], smile: [[0, 0.6]],
    alpha: [[0, 1], [herT[1] + 0.25, 1], [herT[1] + 0.7, 0]], door: CAFE_DOOR }),
  new Actor('him', CAST.him, { keys: himK, yaw0: 0, walk0: 1, phase0: 0.6, head: [[0, -0.5], [1.6, -0.5], [2.6, 0], [3.0, -0.6], [4.0, 0]], smile: [[0, 0.5]],
    alpha: [[0, 1], [himT[1] + 0.25, 1], [himT[1] + 0.7, 0]], door: CAFE_DOOR }),
  new Actor('seeker', CAST.seeker, {
    keys: seekK, yaw0: PI, walk0: 1, phase0: 0.45,
    phone: [[0, 1], [seekStop - 0.25, 1], [seekStop + 0.15, 0]],
    props: [[0, 'phone'], [18, 'coffee']], propSide: 'R',
    head: [[0, 0], [seekStop + 0.1, 0], [seekStop + 0.3, 1.02], [seekStop + 0.75, 1.02], [seekStop + 1.15, -1.2], [seekGo, -1.2], [seekGo + 0.4, 0],
      [seekOut[0], 0], [seekOut[0] + 0.3, -0.8], [seekOut[2] - 0.3, -0.4], [seekOut[2], 0]],
    pitch: [[0, 0], [seekStop + 0.1, 0], [seekStop + 0.3, -0.25], [seekGo - 0.1, -0.2], [seekGo + 0.3, 0]],
    smile: [[0, 0], [seekStop + 1.15, 0], [seekStop + 1.5, 1], [seekGo + 0.9, 0.6], [seekOut[0] + 0.2, 0.3], [seekOut[0] + 0.6, 1]],
    brow: [[0, 0], [seekStop + 1.1, 0], [seekStop + 1.3, 1], [seekStop + 1.8, 0.3], [seekOut[0] + 0.2, 0], [seekOut[0] + 0.4, 1], [seekOut[1] + 0.4, 0.3]],
    noBlink: [[seekStop + 0.1, seekGo + 0.5], [seekOut[0], seekOut[2]]],
    alpha: [[0, 1], [seekIn[2] + 0.2, 1], [seekIn[2] + 0.65, 0], [seekOut0, 0], [seekOut0 + 0.4, 1]], door: CAFE_DOOR }),
  new Actor('browser', CAST.browser, { keys: browK, yaw0: -PI / 2,
    head: [[0, 0.25], [3, -0.2], [6, 0.3], [12, -0.1], [browGo - 0.5, -0.1], [browGo - 0.15, -1.35], [browGo + 0.35, -0.6], [browGo + 0.8, 0], [browQ + 0.2, 0], [browQ + 0.7, 0.8]],
    smile: [[browGo - 0.2, 0], [browGo + 0.2, 0.8]], brow: [[browGo - 0.3, 0], [browGo - 0.1, 1], [browGo + 0.6, 0]] }),
  new Actor('first', CAST.first, { keys: firstK, yaw0: 0, walk0: 1,
    head: [[18.6, 0], [18.95, -1.15], [firstStop - 0.2, -0.3], [firstStop + 0.2, 0], [firstQ + 0.3, 0], [firstQ + 0.8, -0.5]],
    brow: [[18.8, 0], [19.0, 1], [firstStop, 0.4]], smile: [[19.1, 0], [19.5, 0.9]] }),
  new Actor('second', CAST.second, { keys: secK, yaw0: PI, walk0: 1, phase0: 0.2,
    head: [[19.4, 0], [19.75, 1.2], [secStop - 0.2, 0.3], [secStop + 0.2, 0], [secQ + 0.3, 0], [secQ + 0.7, 1.0]],
    smile: [[19.8, 0], [20.2, 0.8]], brow: [[19.7, 0], [19.9, 1], [20.6, 0]] }),
  new Actor('cap', CAST.cap, { keys: capK, yaw0: PI, walk0: 1, phase0: 0.7, phone: [[18.8, 0.8], [21.2, 0.8], [21.6, 0], [capQ + 0.4, 0], [capQ + 0.9, 0.9]], head: [[21.3, 0], [21.6, 0.9], [22.4, 0.2]] }),
  new Actor('camel', CAST.camel, { keys: camK, yaw0: PI, walk0: 1, phase0: 0.35, head: [[21.8, 0], [22.1, 1.1], [22.9, 0.3], [camQ, 0], [camQ + 0.5, -0.9]] }),
  new Actor('pack', CAST.pack, { keys: packK, yaw0: PI, walk0: 1, phase0: 0.15, head: [[23.2, 0], [23.5, 1.0], [24.2, 0.2]] }),
  new Actor('exit', CAST.exit, { keys: exitK, yaw0: PI / 2, walk0: 0, alpha: [[exitGo - 0.2, 0], [exitGo + 0.25, 1]], door: HERO_DOOR, smile: [[0, 0.9]],
    head: [[exitT[0], 0], [exitT[0] + 0.3, 0.6], [exitT[1] - 0.2, 0.6], [exitT[1] + 0.2, 0]] }),
];
// ================================================================== vehicles
const VEH = [
  { kind: 'car', z: 9.35, dir: 1, color: '#E7DFCC', x: (t) => -26 + 8.0 * t, t0: 0, t1: 6 },
  { kind: 'moped', z: 6.05, dir: -1, color: '#A9BCB0', rider: { skin: '#C99273', jacket: '#3D4450', helmet: '#EEE8DC', trousers: '#5B5E66' }, x: (t) => 11.5 - 6.1 * (t - 1.0), t0: 0, t1: 7.5 },
];

// ================================================================== the Fentra signal and the reveal
// a door on a closer: swings open quickly, bumps its stop, and is pulled shut by the damper with a small latch bounce
export function doorSwing(t, tOpen, tClose) {
  if (t <= tOpen) return 0;
  const a = t - tOpen;
  let v = a < 0.55 ? easeO(a / 0.45) : 1;
  if (a >= 0.45 && a < 0.9) v = 1 - 0.05 * Math.exp(-(a - 0.45) * 9) * Math.sin((a - 0.45) * 22);
  if (t > tClose) { const c = t - tClose; v *= 1 - easeIO(c / 0.6); if (c > 0.6) v = Math.max(0, 0.02 * Math.exp(-(c - 0.6) * 12) * Math.sin((c - 0.6) * 30)); }
  return clamp(v, 0, 1.05);
}

export function heroState(t) {
  const ta = t - T.awn0, run = T.awn1 - T.awn0;
  const depth = ta <= 0 ? 0 : ta < run ? easeIO(ta / run) : 1 + 0.035 * Math.exp(-(ta - run) * 5) * Math.sin((ta - run) * 13);
  const valSwing = ta <= run * 0.6 ? 0 : 0.28 * Math.exp(-(ta - run * 0.6) * 2.8) * Math.sin((ta - run * 0.6) * 8.5);
  return {
    ghost: 1 - sstep(T.touch, T.touch + 1.1, t),
    frame: sstep(T.frame0, T.frame1, t),
    sign: inv(T.sign0, T.sign1, t),
    awning: inv(T.awn0, T.awn1, t), awnDepth: depth, valSwing,
    glass: sstep(T.glass0, T.glass1, t),
    sweep: inv(T.glass0, T.glass1 + 0.2, t),
    lights: sstep(T.lights0, T.lights1, t) * (0.85 + 0.15 * sstep(T.lights1, T.lights1 + 1.0, t)),
    props: sstep(T.props0, T.props1, t),
    door: doorSwing(t, STORY.exitGo - 0.2, STORY.exitGo + 1.25),
  };
}

const BLUE = hex(PAL.blue);
function glint(ctx, x, y, s, a, rot = -0.42) {
  // a slanted parallelogram of light, echoing the Fentra mark's geometry
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 5);
  g.addColorStop(0, `rgba(28,115,253,${0.35 * a})`); g.addColorStop(0.35, `rgba(28,115,253,${0.12 * a})`); g.addColorStop(1, 'rgba(28,115,253,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 5, 0, TAU); ctx.fill();
  ctx.globalAlpha = a;
  const w = s * 1.6, h = s * 0.55, sk = s * 0.35;
  ctx.beginPath(); ctx.moveTo(-w / 2 + sk, -h / 2); ctx.lineTo(w / 2 + sk, -h / 2); ctx.lineTo(w / 2 - sk, h / 2); ctx.lineTo(-w / 2 - sk, h / 2); ctx.closePath();
  ctx.shadowColor = 'rgba(28,115,253,0.9)'; ctx.shadowBlur = s * 1.2;
  ctx.fillStyle = PAL.blue; ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.moveTo(-w / 2 + sk * 1.2, -h / 2 + h * 0.2); ctx.lineTo(w / 2 + sk * 0.6, -h / 2 + h * 0.2); ctx.lineTo(w / 2 + sk * 0.4, -h / 2 + h * 0.42); ctx.lineTo(-w / 2 + sk, -h / 2 + h * 0.42); ctx.closePath(); ctx.fill();
  ctx.restore();
}

const SIG = { x: 0, z: 0.3, y0: 22.8, y1: HS.top };
export const sigTipY = (t) => lerp(SIG.y0, SIG.y1, easeIO(inv(T.desc0, T.touch, t)));

function drawSignal(ctx, cam, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const on = sstep(T.sigOn, T.sigOn + 0.7, t);
  if (on <= 0) return;
  const tipY = sigTipY(t), k = cam.k(SIG.z);
  const fadeAfter = 1 - sstep(T.touch + 0.1, T.touch + 1.0, t);
  // the thread of light: bright at the tip, dissolving upward
  if (t > T.desc0 - 0.05 && fadeAfter > 0) {
    const trail = 9 * sstep(T.desc0, T.desc0 + 0.5, t);
    const topY = Math.min(SIG.y0, tipY + trail + (t > T.touch ? (t - T.touch) * 6 : 0));
    const a = cam.P(SIG.x, topY, SIG.z), b = cam.P(SIG.x, tipY, SIG.z);
    const g = ctx.createLinearGradient(0, a[1], 0, b[1]);
    g.addColorStop(0, 'rgba(28,115,253,0)'); g.addColorStop(0.7, `rgba(28,115,253,${0.55 * fadeAfter})`); g.addColorStop(1, `rgba(28,115,253,${0.95 * fadeAfter})`);
    ctx.save();
    ctx.strokeStyle = g; ctx.lineCap = 'round';
    ctx.lineWidth = clamp(k * 0.1, 5, 16); ctx.globalAlpha = 0.18; ctx.filter = 'blur(6px)';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.lineWidth = clamp(k * 0.022, 2, 4.5);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }
  // the glint at the tip
  const p = cam.P(SIG.x, tipY, SIG.z);
  const appear = easeO(inv(T.sigOn, T.sigOn + 0.9, t));
  const pulse = 1 + 0.08 * Math.sin((t - T.sigOn) * 5.5) * (1 - inv(T.desc0, T.desc0 + 0.6, t));
  const s = clamp(k * 0.27, 14, 34) * appear * pulse * (1 - 0.35 * sstep(T.touch - 0.2, T.touch + 0.4, t));
  const ga = on * (1 - sstep(T.touch + 0.25, T.touch + 0.9, t));
  if (ga > 0) glint(ctx, p[0], p[1], s, ga, -0.42 + (1 - appear) * 0.6);
  // a quiet ring where it lands
  const r = inv(T.touch - 0.05, T.touch + 1.1, t);
  if (r > 0 && r < 1) {
    ctx.save(); ctx.strokeStyle = `rgba(28,115,253,${0.3 * (1 - r)})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p[0], p[1], k * (0.2 + 1.1 * easeO(r)), k * (0.06 + 0.22 * easeO(r)), 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
}

function drawTrace(ctx, cam, t) {
  const u = inv(T.touch, T.trace1, t);
  const fade = 1 - sstep(T.frame1 - 0.2, T.sign1 + 0.1, t);
  if (u <= 0 || fade <= 0) return;
  const k = cam.plane(ctx, 0), uu = 1 / k;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    for (const P of TRACE) {
      const pr = easeIO(inv(P.a, P.b, u));
      if (pr <= 0) continue;
      ctx.beginPath(); ctx.moveTo(P.pts[0][0], P.pts[0][1]); for (let i = 1; i < P.pts.length; i++) ctx.lineTo(P.pts[i][0], P.pts[i][1]);
      ctx.setLineDash([P.L * pr, P.L * 2]);
      if (pass === 0) { ctx.strokeStyle = `rgba(28,115,253,${0.22 * fade})`; ctx.lineWidth = clamp(k * 0.06, 5, 14) * uu; ctx.filter = 'blur(4px)'; }
      else { ctx.strokeStyle = `rgba(28,115,253,${0.95 * fade})`; ctx.lineWidth = clamp(k * 0.016, 1.8, 3.6) * uu; ctx.filter = 'none'; }
      ctx.stroke();
      // bright pen tip on the leading paths
      if (pass === 1 && P.tip && pr < 1) {
        let d = P.L * pr, q = P.pts[0];
        for (let i = 1; i < P.pts.length; i++) { const l = Math.hypot(P.pts[i][0] - P.pts[i - 1][0], P.pts[i][1] - P.pts[i - 1][1]); if (d <= l) { q = [lerp(P.pts[i - 1][0], P.pts[i][0], d / l), lerp(P.pts[i - 1][1], P.pts[i][1], d / l)]; break; } d -= l; q = P.pts[i]; }
        ctx.setLineDash([]); const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 0.2);
        g.addColorStop(0, `rgba(160,200,255,${0.9 * fade})`); g.addColorStop(1, 'rgba(28,115,253,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], 0.2, 0, TAU); ctx.fill();
      }
    }
  }
  ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function planters(t) {
  const st = heroState(t);
  if (st.props <= 0) return [];
  return [-1.05, 1.05].map((x) => ({ z: 0.35, draw: (ctx, cam) => {
    const k = cam.plane(ctx, 0.35), u = 1 / k, lw = LW(k);
    const a = st.props;
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(x - 0.24, 0.55); ctx.lineTo(x + 0.24, 0.55); ctx.lineTo(x + 0.2, 0); ctx.lineTo(x - 0.2, 0); ctx.closePath(); ctx.fillStyle = '#26344F'; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * u; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x - 0.22, 0.47, 0.44, 0.04);
    line(ctx, [[x, 0.55], [x, 0.85]], lw * 1.2 * u, '#6B5A4A');
    ctx.beginPath(); ctx.arc(x, 1.12, 0.33, 0, TAU); ctx.fillStyle = '#6F8B6A'; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * u; ctx.stroke();
    ctx.fillStyle = 'rgba(255,245,215,0.25)'; ctx.beginPath(); ctx.arc(x - 0.1, 1.22, 0.14, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(40,60,45,0.25)'; const r = mulberry32(x > 0 ? 3 : 4); for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * 0.5, 1.12 + (r() - 0.5) * 0.5, 0.04, 0.025, r() * 3, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  } }));
}

// ================================================================== birds (sky only)
function drawBirds(ctx, cam, t) {
  if (t < 10.4 || t > 14.5) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const [x0, y, ph, sp] of [[-14, 27.5, 0.1, 2.6], [-15.6, 28.3, 0.55, 2.7], [-16.9, 27.1, 0.3, 2.55]]) {
    const x = x0 + (t - 10.4) * sp, Z = -6;
    const p = cam.P(x, y + Math.sin(t * 1.3 + ph * 6) * 0.2, Z); const k = cam.k(Z);
    const f = Math.sin((t * 5.2 + ph * 7) * 1.0), s = k * 0.32;
    ctx.strokeStyle = 'rgba(60,62,70,0.75)'; ctx.lineWidth = clamp(k * 0.03, 1.2, 2.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(p[0] - s, p[1] - s * 0.35 * f); ctx.quadraticCurveTo(p[0] - s * 0.45, p[1] - s * 0.45 * f - s * 0.1, p[0], p[1]); ctx.quadraticCurveTo(p[0] + s * 0.45, p[1] - s * 0.45 * f - s * 0.1, p[0] + s, p[1] - s * 0.35 * f); ctx.stroke();
  }
}

// ================================================================== typography
const CAP_Y = 400;
function drawCaptions(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const shown = CAPTIONS.map((c) => ({ ...c, a: win(t, c.t0, c.t0 + 0.55, c.t1 - 0.45, c.t1) })).filter((c) => c.a > 0);
  if (!shown.length) return;
  const band = Math.max(...shown.map((c) => c.a));
  const rows = shown.reduce((n, c) => Math.max(n, c.slot + c.text.split('\n').length), 0);
  const bh = 60 + rows * 78, by = CAP_Y + (rows - 1) * 39;
  // a soft paper band keeps the words legible over any part of the street
  const g = ctx.createLinearGradient(0, by - bh / 2 - 60, 0, by + bh / 2 + 60);
  g.addColorStop(0, 'rgba(244,240,232,0)'); g.addColorStop(0.3, `rgba(244,240,232,${0.8 * band})`); g.addColorStop(0.7, `rgba(244,240,232,${0.8 * band})`); g.addColorStop(1, 'rgba(244,240,232,0)');
  ctx.fillStyle = g; ctx.fillRect(0, by - bh / 2 - 60, W, bh + 120);
  for (const c of shown) {
    const rise = (1 - easeO(inv(c.t0, c.t0 + 0.8, t))) * 14;
    c.text.split('\n').forEach((ln, i) => {
      ctx.save(); ctx.globalAlpha = c.a;
      ctx.font = 'italic 400 66px "Instrument Serif"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAL.ink;
      ctx.fillText(ln, W / 2, CAP_Y + (c.slot + i) * 78 + rise);
      ctx.restore();
    });
  }
}

let LOGO = null;
function drawEnd(ctx, t) {
  const a = sstep(T.brand0, T.brand0 + 0.9, t);
  if (a <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(244,240,232,${a})`; ctx.fillRect(0, 0, W, H);
  // blue hairline: the same line that drew the shop, now underlining the promise
  const lw = easeIO(inv(T.brand0 + 0.35, T.logo + 0.2, t));
  const cy = 700;
  // logo
  const la = easeO(inv(T.logo, T.logo + 0.9, t));
  if (la > 0 && LOGO) {
    const w = 560, h = w * LOGO.height / LOGO.width;
    ctx.save(); ctx.globalAlpha = la;
    const x = W / 2 - w / 2, y = cy - h - 30 + (1 - la) * 16;
    // reveal left → right, following the line
    ctx.beginPath(); ctx.rect(x - 10, y - 20, (w + 20) * easeIO(inv(T.logo - 0.1, T.logo + 0.8, t)), h + 40); ctx.clip();
    ctx.drawImage(LOGO, x, y, w, h);
    ctx.restore();
  }
  if (lw > 0) {
    ctx.save(); ctx.strokeStyle = PAL.blue; ctx.lineCap = 'round'; ctx.lineWidth = 3;
    const half = 60 * lw;
    ctx.beginPath(); ctx.moveTo(W / 2 - half, cy + 40); ctx.lineTo(W / 2 + half, cy + 40); ctx.stroke(); ctx.restore();
  }
  const txt = (s, y, font, col, t0, spacing = 0) => {
    const q = easeO(inv(t0, t0 + 0.8, t)); if (q <= 0) return;
    ctx.save(); ctx.globalAlpha = q; ctx.font = font; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (spacing) ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(s, W / 2 + spacing / 2, y + (1 - q) * 12); ctx.restore();
  };
  txt('Görünür olmak tesadüf değildir.', cy + 150, 'italic 400 76px "Instrument Serif"', PAL.ink, T.slogan);
  txt('WEB  •  SEO  •  GEO', cy + 260, '600 30px "Manrope"', '#55575E', T.services, 7);
  txt('@fentra.digital', cy + 420, '500 36px "Manrope"', PAL.blue, T.handle, 1);
}

// ================================================================== frame
let GRAIN = null, VIGNETTE = null, ctxMain = null;
const PROPS = streetProps();

function renderScene(ctx, t) {
  const cam = camAt(t);
  const st = heroState(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  drawSky(ctx, cam, t);
  drawBirds(ctx, cam, t);
  drawFar(ctx, cam);
  drawFacades(ctx, cam, t, st);
  drawGround(ctx, cam, t, st);
  // everything standing in the street, back to front
  const items = [];
  for (const p of PROPS) items.push({ z: p.z - 0.001, draw: (c) => p.draw(c, cam, t) });
  for (const p of planters(t)) items.push({ z: p.z, draw: (c) => p.draw(c, cam, t) });
  for (const a of ACTORS) {
    if (t < a.t0 - 0.01) continue;
    const s = a.state(t);
    if (s.alpha <= 0.001) continue;
    if (cam.z - s.z < 1.0) continue;
    // cull off-screen
    const sx = cam.P(s.x, 1, s.z)[0], k = cam.k(s.z);
    if (sx < -k * 1.2 || sx > W + k * 1.2) continue;
    items.push({ z: s.z, draw: (c) => {
      if (s.door && s.z < 0.35) {
        c.save(); const d = s.door; const p0 = cam.P(d.x0, d.h, 0), p1 = cam.P(d.x1, 0, 0);
        c.beginPath(); c.rect(p0[0], p0[1], p1[0] - p0[0], H - p0[1]); c.clip();
        drawPerson(c, cam, s.P, s); c.restore();
      } else drawPerson(c, cam, s.P, s);
    } });
  }
  for (const v of VEH) {
    if (t < v.t0 || t > v.t1) continue;
    const x = v.x(t);
    if (v.kind === 'car') items.push({ z: v.z, draw: (c) => drawCar(c, cam, { x, z: v.z, dir: v.dir, color: v.color }, t) });
    else items.push({ z: v.z, draw: (c) => drawMoped(c, cam, { x, z: v.z, dir: v.dir, color: v.color, rider: v.rider }, t) });
  }
  for (let i = items.length - 1; i >= 0; i--) if (cam.z - items[i].z < 0.9) items.splice(i, 1);
  items.sort((a, b) => a.z - b.z);
  for (const it of items) { ctx.save(); it.draw(ctx); ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  drawSunAndShade(ctx, cam);
  // light layer (unshaded): warm interior bloom, the signal, the trace
  if (st.lights > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const [a, c] of [HS.wl, HS.wr]) {
      const p = cam.P((a + c) / 2, 2.0, 0), k = cam.k(0);
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], k * 2.2);
      g.addColorStop(0, `rgba(255,200,130,${0.2 * st.lights})`); g.addColorStop(1, 'rgba(255,200,130,0)');
      ctx.fillStyle = g; ctx.fillRect(p[0] - k * 2.2, p[1] - k * 2.2, k * 4.4, k * 4.4);
    }
    ctx.restore();
  }
  drawTrace(ctx, cam, t);
  drawSignal(ctx, cam, t);
  return cam;
}

function post(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // gentle vignette + paper grain
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(VIGNETTE, 0, 0); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(250,222,180,0.28)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22;
  const ox = (Math.floor(t * 12) * 97) % 256, oy = (Math.floor(t * 12) * 61) % 256;
  ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512); ctx.restore();
}

// screen-space motion (px) across the shutter: the camera and anything moving on screen
function motionPx(ta, tb) {
  const A = camAt(ta), B = camAt(tb);
  let m = 0;
  for (const [sx, sy] of [[W / 2, 150], [W / 2, H / 2], [W / 2, H - 150], [80, H / 2], [W - 80, H / 2]]) {
    // the facade point under this pixel, or the ground point if the pixel shows the street
    let X = A.X(sx, 0), Y = A.Y(sy, 0), Z = 0;
    if (Y < 0) { const d = A.f * A.y / Math.max(1, sy - A.hy); Z = A.z - d; Y = 0; X = A.X(sx, Z); if (A.z - Z < 1.5 || B.z - Z < 1.5) continue; }
    const p = A.P(X, Y, Z), q = B.P(X, Y, Z);
    m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  for (const a of ACTORS) {
    if (ta < a.t0 || !a.sim) continue;
    const sa = a.sample(ta), sb = a.sample(tb);
    const p = A.P(sa.x, 1, sa.z), q = B.P(sb.x, 1, sb.z);
    if (p[0] < -200 || p[0] > W + 200 || A.z - sa.z < 1) continue;
    // limbs swing faster than the body moves
    const k = A.k(sa.z), limb = Math.hypot(sb.x - sa.x, sb.z - sa.z) * k * 1.6;
    m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1]) + limb);
  }
  for (const v of VEH) {
    if (ta < v.t0 || ta > v.t1) continue;
    const p = A.P(v.x(ta), 0.7, v.z), q = B.P(v.x(tb), 0.7, v.z);
    if (A.z - v.z < 1 || Math.max(p[0], q[0]) < -600 || Math.min(p[0], q[0]) > W + 600) continue;
    m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  return m;
}

export function renderAt(t) {
  const ctx = ctxMain;
  // motion blur: a 180° shutter (1/60 s at 30 fps) sampled finely enough that nothing ghosts,
  // one sample when the frame is still, never across a cut
  const sh = 1 / 60, ta = t - sh / 2, tb = t + sh / 2;
  const crosses = [T.cut1, T.cut2, T.cut3].some((c) => ta < c && tb >= c);
  const n = crosses || t < 0.02 || t > T.brand0 + 1.0 ? 1 : clamp(Math.ceil(motionPx(ta, tb) / 2.0), 1, 40);
  if (n > 1) {
    const A = scratch(1).g, B = scratch(2).g;
    for (let i = 0; i < n; i++) {
      const ts = ta + (i + 0.5) / n * sh;
      renderScene(B, ts);
      A.setTransform(1, 0, 0, 1, 0, 0); A.filter = 'none'; A.globalCompositeOperation = 'source-over';
      A.globalAlpha = 1 / (i + 1); A.drawImage(B.canvas, 0, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.drawImage(A.canvas, 0, 0);
  } else {
    renderScene(ctx, t);
  }
  drawCaptions(ctx, t);
  drawEnd(ctx, t);
  post(ctx, t);
  return n;
}

// ================================================================== cues for the sound design
export function cues() {
  const steps = [];
  for (const a of ACTORS) {
    for (const [t, x, z, strength] of a.falls) {
      if (t < 0 || t > DUR) continue;
      const cam = camAt(t);
      if (t > T.crane0 + 0.8 && t < T.touch + 3.5) continue;
      const p = cam.P(x, 0.8, z), d = cam.z - z;
      const inFrame = p[0] > -150 && p[0] < W + 150;
      const g = clamp(3.2 / d, 0, 1) * (inFrame ? 1 : 0.35) * (strength ?? 1) * (t > T.brand0 ? 1 - inv(T.brand0, T.brand0 + 1.2, t) : 1);
      if (g < 0.03) continue;
      steps.push([+t.toFixed(3), +clamp((p[0] - W / 2) / (W * 0.7), -1, 1).toFixed(2), +g.toFixed(3), a.name]);
    }
  }
  steps.sort((a, b) => a[0] - b[0]);
  const vehicles = VEH.map((v) => {
    // time of closest approach to the camera centre, and speed
    let best = null;
    for (let t = v.t0; t <= v.t1; t += 1 / 60) { const cam = camAt(t); const x = v.x(t) + (v.kind === 'car' ? v.dir * 1.95 : 0); const dx = Math.abs(x - cam.x); if (!best || dx < best[1]) best = [t, dx, cam.z - v.z]; }
    return { kind: v.kind, t: +best[0].toFixed(3), dir: v.dir, dist: +best[2].toFixed(2) };
  });
  return {
    duration: DUR, fps: 30, cuts: [T.cut1, T.cut2, T.cut3], T, steps, vehicles,
    captions: CAPTIONS,
    doors: [[STORY.herT[1] - 0.35, 'cafe'], [STORY.himT[2] + 0.8, 'cafe'], [STORY.seekOut[0] - 0.95, 'cafe'], [STORY.seekOut[0] + 0.7, 'cafe'], [STORY.exitGo - 0.2, 'hero'], [STORY.exitGo + 1.85, 'hero_close']],
  };
}

export async function boot(canvas) {
  ctxMain = canvas.getContext('2d');
  // the café door opens for the couple, for her on the way in, and again when she comes out
  const S_ = STORY;
  setDoorOpen((kind, t) => (kind === 'cafe' ? Math.max(doorSwing(t, S_.herT[1] - 0.35, S_.himT[2] + 0.2), doorSwing(t, S_.seekIn[2] - 0.35, S_.seekIn[3] + 0.25), doorSwing(t, S_.seekOut[0] - 0.95, S_.seekOut[0] + 0.1)) : 0));
  GRAIN = grainTile(256, 21, 1.0);
  VIGNETTE = document.createElement('canvas'); VIGNETTE.width = W; VIGNETTE.height = H;
  const v = VIGNETTE.getContext('2d');
  const g = v.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#D9D4CC');
  v.fillStyle = g; v.fillRect(0, 0, W, H);
  LOGO = new Image(); LOGO.src = '../assets/fentra-logo-original.png'; await LOGO.decode();
  window.FILM = { duration: DUR, cues, T };
  window.renderAt = renderAt; window.ACTORS = ACTORS; window.motionPx = motionPx; window.STORY = STORY;
  renderAt(0);
}
