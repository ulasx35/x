// Season 2, episode 2 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const BANNER_P = [9, 13, 34], BANNER_Q = [1, 6, 4];             // your banner over the door
const MATCH_P = [-10, 65, 150], MATCH_Q = [5, 11, 2];           // the book above, your tower, the shop and the searcher below
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [30, 100, 175], q: [2, 24, 2], f: 38 },
  // the guide's tower and its book; then down to your banner
  { t: T.b0 + 0.8, p: [-10, 90, 172], q: [5, 24, 4], f: 38, hold: true },
  { t: T.bSimdi, p: [-11, 89, 170], q: [5, 23, 4], f: 38, hold: true },
  { t: T.bSimdi + 1.1, p: BANNER_P, q: BANNER_Q, f: 40, hold: true },
  { t: T.w0 - 0.2, p: [9.5, 13.3, 35], q: BANNER_Q, f: 40, hold: true },
  // 01 the customer's words go to the book; the light lands on the shop, not on you
  { t: T.wYaz + 0.3, p: MATCH_P, q: MATCH_Q, f: 46, hold: true },
  { t: T.wEnd + 0.2, p: [-11, 66, 152], q: MATCH_Q, f: 46, hold: true },
  // your banner switches to the customer's words; the light lands on you too
  { t: T.lMus, p: BANNER_P, q: BANNER_Q, f: 40, hold: true },
  { t: T.lYaz + 1.4, p: [11, 16, 40], q: [2, 7, 4], f: 42, hold: true },
  { t: T.lEnd + 0.2, p: [11.5, 16.4, 41], q: [2, 7, 4], f: 42, hold: true },
  // 02 research: your door; customers tell how they searched
  { t: T.f0 + 1.0, p: [7, 15, 42], q: [0, 3, 9], f: 36, hold: true },
  { t: T.fEnd + 0.2, p: [7.6, 15.5, 43], q: [0, 3, 9.5], f: 36, hold: true },
  // long searches: a crowded street of rival signs; a few people with boxes come to you
  { t: T.n0 + 0.8, p: [-20, 85, 130], q: [-12, 0, 8], f: 44, hold: true },
  { t: T.nEnd + 0.2, p: [-21, 86, 132], q: [-12, 0, 8], f: 44, hold: true },
  // 03 one page, one topic; then the stuffed banner
  { t: T.p0 + 0.9, p: [34, 22, 42], q: [5, 9, -1], f: 40, hold: true },
  { t: T.pAyni - 0.4, p: [35, 22.5, 43], q: [5, 9, -1], f: 40, hold: true },
  { t: T.pAyni + 0.5, p: BANNER_P, q: BANNER_Q, f: 40, hold: true },
  { t: T.pEnd + 0.2, p: [9.4, 13.3, 35], q: BANNER_Q, f: 40, hold: true },
  // recap: the customer's words land on your banner and pages, from high above
  { t: T.xDil, p: [30, 70, 110], q: [0, 12, -6], f: 40, hold: true },
  { t: T.save - 0.2, p: [36, 76, 116], q: [0, 12, -6], f: 40 },
  { t: T.next, p: [-60, 150, 200], q: [0, 0, -10], f: 38 },
  { t: T.END, p: [-190, 215, 70], q: [0, 0, -14], f: 38 },
];

// ?cam=px,py,pz,qx,qy,qz,fov pins the camera (framing checks only)
const PIN = new URLSearchParams(location.search).get('cam')?.split(',').map(Number);

function hermite(key, t) {
  if (t <= K[0].t) return K[0][key];
  const last = K[K.length - 1];
  if (t >= last.t) return last[key];
  let i = 0; while (K[i + 1].t <= t) i++;
  const a = K[i], b = K[i + 1], dt = b.t - a.t, u = (t - a.t) / dt;
  const vel = (j) => {
    const k = K[j];
    if (k.hold || j === 0 || j === K.length - 1) return (Array.isArray(k[key]) ? k[key].map(() => 0) : 0);
    const p = K[j - 1], n = K[j + 1];
    const f = (x, y, z) => 0.5 * ((z - y) / (n.t - k.t) + (y - x) / (k.t - p.t));
    return Array.isArray(k[key]) ? k[key].map((_, c) => f(p[key][c], k[key][c], n[key][c])) : f(p[key], k[key], n[key]);
  };
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  const va = vel(i), vb = vel(i + 1);
  if (Array.isArray(a[key])) return a[key].map((_, c) => h00 * a[key][c] + h10 * dt * va[c] + h01 * b[key][c] + h11 * dt * vb[c]);
  return h00 * a[key] + h10 * dt * va + h01 * b[key] + h11 * dt * vb;
}

export function placeCamera(camera, t) {
  const p = new THREE.Vector3(...(PIN ? PIN.slice(0, 3) : hermite('p', t))), q = new THREE.Vector3(...(PIN ? PIN.slice(3, 6) : hermite('q', t)));
  const fov = PIN ? PIN[6] : hermite('f', t);
  p.x += Math.sin(t * 0.37) * 0.2; p.y += Math.sin(t * 0.29 + 1.3) * 0.14;
  camera.position.copy(p); camera.lookAt(q);
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
