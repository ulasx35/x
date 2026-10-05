// Episode 5 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const SAFE_P = [-1, 13, 40], SAFE_Q = [-4.5, 1, 18];
const LOCK_P = [0, 5, 22], LOCK_Q = [-3, 2.5, 8];
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [72, 80, 118], q: [-10, 1, 14], f: 36 },
  { t: T.bHazir + 0.4, p: [36, 34, 76], q: [-4, 4, 10], f: 36 },
  { t: T.bGuven + 0.3, p: [8, 11, 40], q: [0, 2.6, 9], f: 36 },
  // the whole building on the left, the card on the right: it shakes, breaks and falls
  { t: T.bCok + 0.2, p: [-14, 22, 76], q: [7, 11, 0], f: 36, hold: true },
  { t: T.cSil, p: [-14.3, 22.5, 77], q: [7, 11, 0], f: 36 },
  { t: T.cEnd + 1.0, p: [-14, 22, 76], q: [6, 6, 1], f: 36, hold: true },
  // 02 the safe in front of the rubble; then the building rises again
  { t: T.kKopya - 0.2, p: SAFE_P, q: SAFE_Q, f: 36, hold: true },
  { t: T.kAnahtar + 0.4, p: [-1.4, 12.6, 39], q: [-4.5, 1.6, 18], f: 36 },
  { t: T.kGeri + 0.3, p: [4, 10, 42], q: [-1.5, 5, 8], f: 36 },
  { t: T.kEnd, p: [6, 16, 42], q: [-0.5, 12, 3], f: 36, hold: true },
  // not in the same building: a ghost safe burns in the lobby; a copy goes up to a cloud
  { t: T.oAyni + 0.3, p: [-8, 9, 38], q: [2, 5, 3], f: 36, hold: true },
  { t: T.oKasa + 0.6, p: [-8.4, 9.4, 39], q: [2, 5.4, 3], f: 36 },
  { t: T.oBulut - 0.2, p: [12, 10, 60], q: [-4, 10, 12], f: 36, hold: true },
  { t: T.oEnd + 0.2, p: [12.5, 10.5, 61], q: [-4, 10, 12], f: 36, hold: true },
  // daily backups at the safe, then the keys at the lock
  { t: T.aHer, p: SAFE_P, q: [-4.5, 2.4, 18], f: 36, hold: true },
  { t: T.aDene - 0.1, p: [-1.2, 12.8, 39.5], q: [-4.4, 2.6, 18], f: 36, hold: true },
  { t: T.aDene + 0.9, p: LOCK_P, q: LOCK_Q, f: 36, hold: true },
  { t: T.aEnd + 0.2, p: [0.3, 5.1, 22.5], q: [-3, 2.5, 8], f: 36, hold: true },
  // 03 the rusty lock, attackers from the square, a new lock
  { t: T.uYazilim, p: [-2, 6, 30], q: [-1.5, 2.6, 8], f: 36, hold: true },
  { t: T.uSaldir + 0.6, p: [2, 8, 34], q: [-2, 2.6, 9], f: 36 },
  { t: T.uEnd + 0.6, p: [2.3, 8.4, 34.5], q: [-2.3, 2.6, 9], f: 36, hold: true },
  // pull back: the safe, the cloud and the building
  { t: T.hOto, p: [12, 11, 62], q: [-3, 10, 11], f: 36, hold: true },
  { t: T.hEnd, p: [14, 13, 68], q: [-3, 10, 10], f: 36, hold: true },
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
