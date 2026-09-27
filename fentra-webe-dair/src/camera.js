// Camera: time-keyed moves through the city (C1-continuous Hermite through keyframes),
// plus a drone that follows the DNS route as it is drawn.
import * as THREE from 'three';
import { T } from './timeline.js';
import { clamp, prog, smooth, inOut } from './anim.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const K = [
  { t: 0, p: [0, 300, 150], q: [0, 0, -20], f: 40, hold: true },
  { t: T.perde - 0.3, p: [0, 300, 150], q: [0, 0, -20], f: 40, hold: true },
  { t: T.three + 1.1, p: [70, 150, 175], q: [-12, 0, 18], f: 38 },
  { t: T.ep + 0.6, p: [100, 110, 150], q: [-6, 0, 8], f: 36 },
  { t: T.titleEnd + 0.1, p: [70, 60, 92], q: [-2, 2, 2], f: 34 },
  { t: T.d1 + 1.3, p: [26, 17, 47], q: [-3, 3.5, 4], f: 34 },
  { t: T.dName - 0.2, p: [11, 9, 41], q: [-5, 4.8, 8.4], f: 34 },
  { t: T.dShop + 0.4, p: [3, 7.5, 38], q: [-5.4, 4.8, 8.4], f: 34 },
  { t: T.dEnd + 0.2, p: [-17, 11, 38], q: [-3, 4, 4], f: 35 },
  { t: T.hTerm + 0.9, p: [2, 19, 40], q: [0, 3, 0], f: 35 },
  { t: T.hAll + 1.5, p: [13, 14, 33], q: [0, 3.5, -1], f: 34 },
  { t: T.hSunucu + 0.6, p: [12, 10, 26], q: [0.3, 3.4, -1], f: 34 },
  { t: T.hRent + 0.8, p: [8, 7.5, 19], q: [0.2, 3.4, -1], f: 34, hold: true },
  { t: T.hBina + 0.6, p: [30, 26, 62], q: [0, 10, -1], f: 35 },
  { t: T.hBinaW + 0.9, p: [52, 48, 88], q: [0, 13, -1], f: 36 },
  { t: T.iSorun + 0.4, p: [-55, 220, 335], q: [-18, 0, 56], f: 34 },
  { t: T.iIP + 0.3, p: [-36, 82, 122], q: [-8, 5, 14], f: 36 },
  { t: T.nBook + 0.2, p: [-60, 250, 380], q: [-20, 0, 60], f: 34 },
  { t: T.nArrive + 0.1, p: [-52, 232, 350], q: [-16, 0, 52], f: 34 },
  { t: T.m0 + 1.6, p: [-20, 300, 360], q: [6, 0, -46], f: 38 },
  { t: T.mOnly + 0.2, p: [-30, 290, 350], q: [10, 0, -56], f: 38 },
  { t: T.mWave + 0.4, p: [-50, 320, 380], q: [4, 0, -44], f: 38 },
  { t: T.mEnd + 0.3, p: [-70, 330, 400], q: [0, 0, -30], f: 38 },
  { t: T.rType - 0.2, p: [-76, 140, 212], q: [-24, 0, 26], f: 38 },
  { t: T.rOpen + 0.5, p: [-58, 110, 170], q: [-14, 2, 6], f: 38 },
  { t: T.o0 + 1.5, p: [-120, 170, 170], q: [0, 0, -10], f: 38 },
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

export function placeCamera(camera, t, city) {
  const p = new THREE.Vector3(...hermite('p', t)), q = new THREE.Vector3(...hermite('q', t));
  let fov = hermite('f', t);
  // drone follow while the first route is drawn ("sizi doğru binaya götürür")
  const d0 = T.nConv + 0.25, d1 = T.nArrive + 0.1;
  const w = 0;
  if (w > 0) {
    const r = city.routes.route1, u = inOut(prog(t, T.nConv + 0.35, T.nArrive - 0.1));
    const lag = clamp(u - 0.06), head = r.at(u), back = r.at(lag), ahead = r.at(clamp(u + 0.08));
    const dir = head.clone().sub(back); if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1); dir.normalize();
    const cp = back.clone().addScaledVector(dir, -22).add(new THREE.Vector3(10, 34, 0));
    const cq = ahead.clone().add(new THREE.Vector3(0, 2, 0));
    p.lerp(cp, w); q.lerp(cq, w); fov += (42 - fov) * w;
  }
  // a breath of life: tiny slow drift
  p.x += Math.sin(t * 0.37) * 0.25; p.y += Math.sin(t * 0.29 + 1.3) * 0.18;
  camera.position.copy(p); camera.lookAt(q);
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
