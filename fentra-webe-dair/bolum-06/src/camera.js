// Episode 6 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const CARD_P = [-13, 30, 90], CARD_Q = [6, 22, 0];             // the tower with its pin, left of the card
const SQ_P = [-5, 22, 58], SQ_Q = [2.5, 3, 22];                // the square: people on their phones, the shop on the right
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [72, 80, 118], q: [-10, 1, 14], f: 36 },
  { t: T.bHazir + 0.4, p: [36, 34, 76], q: [-4, 4, 10], f: 36 },
  { t: T.bGuven + 0.3, p: [8, 11, 40], q: [0, 2.6, 9], f: 36 },
  // the city becomes a map: rivals' pins drop, yours is missing
  { t: T.bHarita + 0.4, p: [0, 300, 140], q: [0, 0, 10], f: 40, hold: true },
  { t: T.k0 - 0.3, p: [0, 290, 138], q: [0, 0, 10], f: 40, hold: true },
  // 01 your pin lands on the building; its card fills up
  { t: T.k0 + 1.4, p: [-12, 30, 90], q: [1, 22, 0], f: 36, hold: true },
  { t: T.kArama, p: CARD_P, q: CARD_Q, f: 36 },
  { t: T.kEnd, p: [-13.5, 31, 92], q: CARD_Q, f: 36, hold: true },
  // people on the square decide on their phones; back to the tower as its pin vanishes; down again as they walk to the shop
  { t: T.w0 + 0.9, p: SQ_P, q: SQ_Q, f: 42, hold: true },
  { t: T.wKarti + 0.3, p: [-5.4, 22.3, 58.8], q: SQ_Q, f: 42, hold: true },
  { t: T.wKarti + 1.4, p: CARD_P, q: CARD_Q, f: 36, hold: true },
  { t: T.wMusteri - 0.1, p: [-13.4, 30.5, 91], q: CARD_Q, f: 36, hold: true },
  { t: T.wMusteri + 0.9, p: SQ_P, q: SQ_Q, f: 42, hold: true },
  { t: T.wEnd + 0.3, p: [-5.5, 22.4, 59], q: [3, 3, 21.5], f: 42, hold: true },
  // 02 the pin comes back, verified; the card fills up
  { t: T.sDogru - 0.5, p: CARD_P, q: CARD_Q, f: 36, hold: true },
  { t: T.sEnd + 0.2, p: [-13.6, 31.2, 93], q: CARD_Q, f: 36, hold: true },
  // 03 reviews from people leaving; then the closed door
  { t: T.vVitrin, p: [7, 15, 42], q: [0, 3, 9], f: 36, hold: true },
  { t: T.vEnd, p: [7.5, 15.4, 43], q: [0, 3, 9.5], f: 36, hold: true },
  { t: T.hDegis, p: [2, 7, 30], q: [0, 2.6, 8], f: 36, hold: true },
  { t: T.hEnd + 0.3, p: [2.2, 7.2, 31], q: [0, 2.6, 8], f: 36, hold: true },
  // recap: crane up; the whole season lights up
  { t: T.gIgne + 0.2, p: [40, 60, 90], q: [0, 14, 0], f: 36 },
  { t: T.gTamam, p: [80, 110, 150], q: [0, 4, 0], f: 38, hold: true },
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
