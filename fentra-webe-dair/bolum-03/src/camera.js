// Episode 3 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const BOX_P = [13, 7, 25], BOX_Q = [2.8, 2.6, 7];
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [72, 80, 118], q: [-10, 1, 14], f: 36 },
  { t: T.bBina + 0.2, p: [52, 58, 100], q: [-8, 5, 12], f: 36 },
  { t: T.bKilit + 0.3, p: [30, 26, 64], q: [-2, 3, 8], f: 36 },
  { t: T.bPosta + 0.2, p: [12, 6.5, 24], q: [2.2, 2.4, 6.5], f: 36 },
  { t: T.w0 + 0.8, p: BOX_P, q: BOX_Q, f: 36 },
  { t: T.wAdr + 0.4, p: [9.5, 4.6, 19.5], q: [3.6, 2.4, 8], f: 36 },
  { t: T.wMusteri + 0.6, p: [16, 12, 38], q: [0, 3, 10], f: 36 },
  { t: T.wEnd, p: [17, 13, 41], q: [0, 3, 11], f: 36 },
  { t: T.tHerkes + 0.4, p: [15, 15, 54], q: [1, 2.5, 21], f: 36 },
  { t: T.tDolan + 0.6, p: [14, 14, 52], q: [2, 2.5, 20], f: 36 },
  { t: T.tSiz + 0.3, p: [12, 8, 30], q: [3, 2.6, 8], f: 36 },
  { t: T.tEnd, p: [12.5, 8.5, 31], q: [3, 2.6, 8.5], f: 36 },
  { t: T.sSahte + 0.4, p: [10, 40, 82], q: [-14, 2, 18], f: 36 },
  { t: T.sDns, p: [10, 22, 58], q: [-4, 2, 12], f: 36 },
  { t: T.sBunlar, p: [14, 9.5, 33], q: [4, 2.4, 8.5], f: 36 },
  { t: T.sEnd, p: [14.5, 9.5, 33.5], q: [4.2, 2.4, 8.5], f: 36 },
  { t: T.pDus, p: [16, 10, 34], q: [5, 2.6, 8.6], f: 36 },
  { t: T.uSatis - 0.2, p: [15, 7.5, 27], q: [6.2, 2.6, 7.6], f: 36 },
  { t: T.uEnd, p: [15.5, 8, 28], q: [6.4, 2.6, 7.6], f: 36 },
  { t: T.xSure, p: [5, 17, 46], q: [0.5, 3.2, 7.5], f: 36 },
  { t: T.xEnd, p: [4.5, 18, 48], q: [0.5, 3.2, 7.5], f: 36 },
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
