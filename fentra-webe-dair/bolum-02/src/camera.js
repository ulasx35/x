// Episode 2 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const CAFE_P = [-20, 30, 97], CAFE_Q = [-44, 3, 58];
const DOOR_P = [11, 5.5, 18], DOOR_Q = [0.3, 2.2, 5.3];
const WIDE_P = [-60, 240, 360], WIDE_Q = [-20, 0, 60];
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [72, 80, 118], q: [-10, 1, 14], f: 36 },
  { t: T.bBina + 0.3, p: [62, 66, 112], q: [-6, 6, 10], f: 36 },
  { t: T.bYol + 0.9, p: [-8, 110, 190], q: [-22, 0, 52], f: 36 },
  { t: T.bKilit + 0.2, p: [16, 12, 36], q: [0, 3, 5], f: 36 },
  { t: T.bEnd + 0.3, p: DOOR_P, q: DOOR_Q, f: 36 },
  { t: T.hTel + 0.4, p: [10, 30, 58], q: [-14, 2, 20], f: 36 },
  { t: T.hHttp + 0.2, p: [-24, 24, 96], q: [-42, 2, 62], f: 36 },
  { t: T.hKart + 0.4, p: [-22, 26, 102], q: [-43, 2.5, 64], f: 36 },
  { t: T.hKafe + 0.6, p: CAFE_P, q: CAFE_Q, f: 36 },
  { t: T.hEnd, p: [-21, 29, 95], q: [-44, 3.2, 58], f: 36 },
  { t: T.sKoyar + 0.2, p: [-22, 28, 94], q: [-44, 3, 59], f: 36 },
  { t: T.sGuvenli + 0.4, p: [-26, 34, 104], q: [-43, 3, 61], f: 36 },
  { t: T.sTarayici + 0.3, p: WIDE_P, q: WIDE_Q, f: 34 },
  { t: T.sSunucu + 0.7, p: [-56, 226, 340], q: [-19, 0, 58], f: 34 },
  { t: T.sGecir + 0.2, p: CAFE_P, q: [-43.5, 4, 58], f: 36 },
  { t: T.sEnd, p: [-21, 29, 94], q: [-43.5, 4, 58], f: 36 },
  { t: T.cIste, p: [30, 18, 46], q: [2, 7, 0], f: 36 },
  { t: T.cKimlik + 0.5, p: [28, 21, 58], q: [0, 7, 2], f: 36 },
  { t: T.cKontrol, p: [15, 10.5, 36], q: [0, 3.6, 4], f: 36 },
  { t: T.cHer + 0.1, p: [12, 6.5, 21], q: [0.4, 2.3, 5.3], f: 36 },
  { t: T.cKilit + 0.9, p: DOOR_P, q: DOOR_Q, f: 36, hold: true },
  { t: T.wUyar, p: [12, 19, 54], q: [0, 5.6, 10], f: 36 },
  { t: T.wGoogle, p: [14, 22, 60], q: [0, 5.8, 11], f: 36 },
  { t: T.p0 + 0.2, p: [-6, 16, 38], q: [0, 3, 6], f: 36 },
  { t: T.pUcretsiz + 0.2, p: DOOR_P, q: DOOR_Q, f: 36, hold: true },
  { t: T.pYeniler + 1.2, p: [12.5, 7, 22], q: [0.4, 2.4, 5.3], f: 36 },
  { t: T.pKilitli + 0.4, p: [28, 24, 56], q: [0, 7, 2], f: 36 },
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
