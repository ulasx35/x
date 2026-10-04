// Episode 4 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const QUEUE_P = [2, 26, 52], QUEUE_Q = [2, 0, 15.5];
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [72, 80, 118], q: [-10, 1, 14], f: 36 },
  { t: T.bBina + 0.2, p: [52, 58, 100], q: [-8, 5, 12], f: 36 },
  { t: T.bKilit + 0.3, p: [30, 26, 64], q: [-2, 3, 8], f: 36 },
  { t: T.bPosta + 0.2, p: [14, 13, 42], q: [2, 2.4, 9], f: 36 },
  { t: T.bKuyruk + 0.4, p: [4, 24, 52], q: [2, 0, 15], f: 36 },
  // 01 the queue: out of the door and across the square; the shop next door on the right
  { t: T.wKapat + 0.4, p: QUEUE_P, q: QUEUE_Q, f: 36 },
  { t: T.wSonra, p: [3, 25, 51], q: [3.2, 0, 16.5], f: 36 },
  { t: T.wEnd, p: [3.5, 26, 53], q: [3.2, 0, 16], f: 36, hold: true },
  // 02 a heavy photo coming down the long street towards us
  { t: T.iGorsel - 0.2, p: [-39, 15, 16], q: [-43, 1, 46], f: 36, hold: true },
  { t: T.iSikis, p: [-39.3, 14.5, 17], q: [-43, 1, 45], f: 36 },
  { t: T.iEnd, p: [-39.5, 14, 17.5], q: [-43, 1, 42], f: 36, hold: true },
  // a crowded building, then the wide door
  { t: T.hUcuz, p: [-30, 12, 66], q: [6, 12, 0], f: 36, hold: true },
  { t: T.hPay + 0.5, p: [-31, 13, 64], q: [6, 12.5, 0], f: 36 },
  { t: T.hKapi, p: [-20, 12, 54], q: [3, 4, 8], f: 36 },
  { t: T.hGenis + 0.2, p: [-9, 9, 38], q: [2, 2.4, 9], f: 36 },
  { t: T.hEnd, p: [-8, 9.5, 39], q: [2, 2.4, 10], f: 36, hold: true },
  // 03 branches across the city
  { t: T.cUzak + 0.4, p: [0, 330, 125], q: [0, 0, 11], f: 40, hold: true },
  { t: T.cEnd, p: [0, 315, 118], q: [0, 0, 12], f: 40, hold: true },
  // the gauge over the door
  { t: T.xGoogle, p: [4.6, 7.2, 36], q: [2.0, 5.2, 5.5], f: 36, hold: true },
  { t: T.xEnd, p: [4.9, 7.3, 34.5], q: [2.0, 5.2, 5.5], f: 36, hold: true },
  { t: T.r0 + 1.2, p: [80, 110, 150], q: [0, 0, 0], f: 38 },
  { t: T.next, p: [-60, 150, 200], q: [0, 0, -10], f: 38 },
  { t: T.END, p: [-190, 215, 70], q: [0, 0, -14], f: 38 },
];

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
  const p = new THREE.Vector3(...hermite('p', t)), q = new THREE.Vector3(...hermite('q', t));
  const fov = hermite('f', t);
  p.x += Math.sin(t * 0.37) * 0.2; p.y += Math.sin(t * 0.29 + 1.3) * 0.14;
  camera.position.copy(p); camera.lookAt(q);
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
