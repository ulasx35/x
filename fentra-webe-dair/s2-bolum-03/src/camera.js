// Season 2, episode 3 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const WIDE_P = [1, 26, 50], WIDE_Q = [0, 13, 6];                // your board and the boards on either side of it
const CLOSE_P = [-3, 4, 33], CLOSE_Q = [0, 9.4, 6];             // your board from the sidewalk, people walking below it
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.3, p: [60, 30, 70], q: [22, 6, 8], f: 40 },
  // along the sidewalk: the boards light up one by one; then yours
  { t: T.b0 + 0.9, p: [30, 7.5, 32], q: [24, 6, 8], f: 40, hold: true },
  { t: T.bVitrin + 0.5, p: WIDE_P, q: WIDE_Q, f: 48, hold: true },
  // 01 the two lines; people only look at windows
  { t: T.wMus - 0.2, p: [1.5, 26.3, 51], q: WIDE_Q, f: 48, hold: true },
  { t: T.wEnd + 0.1, p: [-12, 7, 31], q: [-14, 6, 8], f: 40, hold: true },
  // "Anasayfa"; 02 the title; 03 the description — up close
  { t: T.d0 + 1.0, p: CLOSE_P, q: CLOSE_Q, f: 44, hold: true },
  { t: T.tEnd, p: [-3.5, 4.2, 34], q: CLOSE_Q, f: 44, hold: true },
  { t: T.a0 + 0.6, p: [-2.6, 4, 32.5], q: CLOSE_Q, f: 44, hold: true },
  { t: T.aEnd + 0.1, p: [-3.2, 4.3, 34], q: CLOSE_Q, f: 44, hold: true },
  // every page its own pair; the admin panel
  { t: T.p0 + 0.9, p: [34, 22, 42], q: [5, 9, -1], f: 40, hold: true },
  { t: T.pEnd + 0.1, p: [35, 22.5, 43], q: [5, 9, -1], f: 40, hold: true },
  // recap: people stop at your board and go in; then up
  { t: T.x0 + 0.9, p: WIDE_P, q: WIDE_Q, f: 48, hold: true },
  { t: T.save - 0.2, p: [2, 30, 56], q: WIDE_Q, f: 48, hold: true },
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
