// Season 2, episode 1 camera: time-keyed moves through the city (C1-continuous Hermite through keyframes).
import * as THREE from 'three';
import { T } from './timeline.js';

// p = position, q = look-at target, f = vertical fov; hold = come to rest on this key
const BOOK_P = [0, 84, -2], BOOK_Q = [0, 54, -56];             // the record book, from the front and above
const PAGES_P = [34, 22, 42], PAGES_Q = [5, 9, -1];             // your tower's pages, /kampanya nearest
const K = [
  { t: 0, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.hookEnd, p: [40, 230, 270], q: [-10, 0, 20], f: 38, hold: true },
  { t: T.title + 1.2, p: [95, 115, 150], q: [-8, 0, 10], f: 36 },
  { t: T.titleEnd + 0.4, p: [62, 74, 110], q: [-4, 10, 4], f: 36 },
  // last season's pins; then up, to where the guide's tower will rise
  { t: T.b0 + 0.7, p: [40, 60, 90], q: [0, 14, 0], f: 36, hold: true },
  { t: T.bOne + 0.2, p: [6, 80, 150], q: [4, 22, -10], f: 38 },
  // the guide: its tower rises behind yours, the book opens, the light sweeps the city and points at three addresses
  { t: T.g0 + 0.9, p: [-10, 90, 172], q: [5, 24, 4], f: 38, hold: true },
  { t: T.gEnd, p: [-12, 92, 176], q: [5, 24, 4], f: 38, hold: true },
  // 01 crawling: out of the book; along the links; onto your tower; your pages
  { t: T.c0 + 0.9, p: [14, 68, -18], q: [0, 55, -56], f: 40, hold: true },
  { t: T.cGez + 0.2, p: [12, 69, -16], q: [0, 54, -56], f: 40, hold: true },
  { t: T.cGez + 1.6, p: [-30, 90, 150], q: [-5, 11, -24], f: 42, hold: true },
  { t: T.cSayfa + 0.5, p: [-31, 91, 152], q: [-5, 11, -24], f: 42, hold: true },
  { t: T.cBag + 0.3, p: [40, 46, 62], q: [2, 14, -2], f: 40, hold: true },
  { t: T.cBag + 1.2, p: [41, 45, 63], q: [2, 13, -2], f: 40, hold: true },
  { t: T.cHic, p: PAGES_P, q: PAGES_Q, f: 40, hold: true },
  { t: T.cEnd + 0.1, p: [35, 22.5, 43], q: PAGES_Q, f: 40, hold: true },
  // 02 the index: your card rides to the book; a search looks only at the book; /kampanya isn't in it
  { t: T.iOkur - 0.3, p: [110, 70, 140], q: [0, 16, -32], f: 38, hold: true },
  { t: T.iEkler + 0.3, p: [108, 71, 138], q: [0, 17, -32], f: 38, hold: true },
  { t: T.iArama + 0.9, p: BOOK_P, q: BOOK_Q, f: 38, hold: true },
  { t: T.iOlmayan, p: [1, 85, -1], q: BOOK_Q, f: 38, hold: true },
  { t: T.iOlmayan + 1.1, p: PAGES_P, q: PAGES_Q, f: 40, hold: true },
  { t: T.iEnd + 0.3, p: [35, 22.5, 43], q: PAGES_Q, f: 40, hold: true },
  // 03 ranking: your tower on the avenue climbs to rank 1; then the dark back street (the second page)
  { t: T.r0 + 1.0, p: [60, 80, 110], q: [12, 22, 0], f: 42, hold: true },
  { t: T.rIlk - 0.4, p: [62, 81, 112], q: [12, 22, 0], f: 42, hold: true },
  // straight down: the bright avenue in front of your tower, the dark back street behind it
  { t: T.rIlk + 0.7, p: [10, 170, 30], q: [10, 0, -4], f: 42, hold: true },
  { t: T.rEnd + 0.2, p: [10, 174, 31], q: [10, 0, -4], f: 42, hold: true },
  // a site: search lists your pages in the book
  { t: T.k0 + 1.0, p: [-20, 70, 5], q: [5, 58, -60], f: 42, hold: true },
  { t: T.kEnd, p: [-21, 70.5, 6], q: [5, 58, -60], f: 42, hold: true },
  // recap: the whole route, high above the city
  { t: T.xGez, p: [50, 110, 150], q: [0, 14, -22], f: 38, hold: true },
  { t: T.save - 0.2, p: [56, 116, 156], q: [0, 12, -22], f: 38 },
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
