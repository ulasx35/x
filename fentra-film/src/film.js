// Fentra Digital Studio — 20s vertical brand film.
// Deterministic: everything is a pure function of time t (seconds). render.mjs calls
// window.renderAt(t) for each of the 480 frames (24 fps) and captures the page.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const W = 1080, H = 1920;
const BLUE_HEX = '#1c73fd'; // Fentra accent (also --blue in style.css)

// ---------------------------------------------------------------- utilities
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260925);
const rr = (a, b) => a + (b - a) * rand();
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const win = (t, a, b, c, d) => sstep(a, b, t) * (1 - sstep(c, d, t));
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function canvasTex(size, draw, { srgb = true, w = size, h = size } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function speckle(g, w, h, amt, seed) {
  const r = mulberry32(seed);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

// Stone cladding: 6m tile, 1.5 x 0.75 m panels.
function stoneTexture(seed, jointAlpha = 0.5) {
  return canvasTex(1024, (g, s) => {
    const r = mulberry32(seed);
    const pw = s / 4, ph = s / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const v = 200 + (r() - 0.5) * 14;
      g.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
      g.fillRect(x * pw, y * ph, pw, ph);
      // faint veining
      g.globalAlpha = 0.05;
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = r() > 0.5 ? '#fff' : '#777'; g.lineWidth = 1 + r() * 2;
        g.beginPath(); g.moveTo(x * pw + r() * pw, y * ph); g.lineTo(x * pw + r() * pw, y * ph + ph); g.stroke();
      }
      g.globalAlpha = 1;
    }
    speckle(g, s, s, 16, seed + 1);
    g.fillStyle = `rgba(40,38,35,${jointAlpha})`;
    for (let y = 0; y <= 8; y++) g.fillRect(0, y * ph - 1, s, 2);
    for (let x = 0; x <= 4; x++) g.fillRect(x * pw - 1, 0, 2, s);
  });
}

// Wet stone paving: 4.8 m tile, 1.2 x 0.6 m slabs, running bond.
const pavingTex = canvasTex(2048, (g, s) => {
  const r = mulberry32(99);
  const sw = s / 4, sh = s / 8;
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
    const off = (y % 2) * sw * 0.5;
    const v = 70 + (r() - 0.5) * 16;
    g.fillStyle = `rgb(${v},${v - 1},${v - 3})`;
    g.fillRect(x * sw + off, y * sh, sw, sh);
  }
  speckle(g, s, s, 22, 5);
  g.fillStyle = 'rgba(18,18,18,0.9)';
  for (let y = 0; y <= 8; y++) {
    g.fillRect(0, y * sh - 2, s, 4);
    const off = (y % 2) * sw * 0.5;
    for (let x = -1; x < 6; x++) g.fillRect(x * sw + off - 2, y * sh, 4, sh);
  }
});
// Puddle / wetness mask (alpha): low where the stone is wet enough to mirror.
const wetTex = canvasTex(512, (g, s) => {
  const r = mulberry32(7);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 26; i++) {
    const x = r() * s, y = r() * s, rad = 30 + r() * 110;
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, 'rgba(60,60,60,0.9)'); gr.addColorStop(1, 'rgba(60,60,60,0)');
      g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
}, { srgb: false });

// Vertical room-light gradient (bright ceiling wash → darker floor).
const roomGrad = canvasTex(256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.18, '#e6e6e6'); gr.addColorStop(0.6, '#8a8a8a'); gr.addColorStop(1, '#4a4a4a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, { w: 4, h: 256 });

// Architectural drawing sheet (lines only, no text).
const drawingTex = canvasTex(512, (g, s) => {
  const r = mulberry32(31);
  g.fillStyle = '#efece6'; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 2;
  g.strokeRect(40, 40, s - 80, s - 80);
  for (let i = 0; i < 14; i++) {
    const x = 60 + r() * (s - 180), y = 60 + r() * (s - 180), w = 40 + r() * 140, h = 30 + r() * 120;
    g.lineWidth = r() > 0.7 ? 2.5 : 1; g.strokeRect(x, y, w, h);
  }
  g.lineWidth = 1; g.strokeStyle = 'rgba(40,40,40,0.25)';
  for (let x = 60; x < s - 40; x += 24) { g.beginPath(); g.moveTo(x, s - 70); g.lineTo(x + 10, s - 60); g.stroke(); }
});

// Muted abstract canvases for the gallery (colour fields).
function artTex(seed, a, b) {
  return canvasTex(256, (g, s) => {
    const r = mulberry32(seed);
    g.fillStyle = a; g.fillRect(0, 0, s, s);
    g.fillStyle = b; g.fillRect(s * 0.12, s * (0.2 + r() * 0.15), s * 0.76, s * (0.3 + r() * 0.2));
    speckle(g, s, s, 10, seed);
  });
}

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const FOG = new THREE.Color(0x151b24);
scene.fog = new THREE.FogExp2(FOG, 0.0105);
scene.background = FOG.clone();

const camera = new THREE.PerspectiveCamera(54.4, W / H, 0.1, 900);

// Blue-hour sky dome.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {},
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    varying vec3 vDir;
    void main(){
      float h = vDir.y;
      vec3 zen = vec3(0.0035,0.0055,0.0110);
      vec3 mid = vec3(0.0120,0.0175,0.0290);
      vec3 hor = vec3(0.0300,0.0360,0.0480);
      vec3 col = mix(hor, mid, smoothstep(0.0,0.18,h));
      col = mix(col, zen, smoothstep(0.18,0.75,h));
      float toward = max(0., dot(normalize(vDir.xz+1e-4), vec2(0.,-1.)));
      col += vec3(0.050,0.030,0.018) * exp(-max(h,0.)*18.) * pow(toward,6.);
      gl_FragColor = vec4(col,1.);
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
scene.add(sky);

// Environment for reflections / IBL: sky + scattered warm city lights.
{
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.95, 0.6) });
  const cool = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.3, 0.38) });
  const er = mulberry32(3);
  for (let i = 0; i < 90; i++) {
    const a = er() * Math.PI * 2, y = er() * 18 - 2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1 + er() * 3, 0.6 + er() * 1.6), er() > 0.35 ? warm : cool);
    m.position.set(Math.cos(a) * 40, y, Math.sin(a) * 40); m.lookAt(0, y, 0);
    envScene.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(envScene, 0.015).texture;
  scene.environmentIntensity = 0.55;
}

scene.add(new THREE.HemisphereLight(0x3a4a66, 0x17130f, 0.35));

// ---------------------------------------------------------------- materials
function std(color, rough, metal, map, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  if (map) m.map = map;
  return m;
}
const stoneA = stoneTexture(11), stoneB = stoneTexture(23, 0.35), stoneC = stoneTexture(41, 0.25);
const M = {
  limestone: std(0xcfc6b8, 0.82, 0, stoneA),
  warmStone: std(0xa99d8d, 0.85, 0, stoneB),
  grayStone: std(0x85837f, 0.86, 0, stoneC),
  charcoal: std(0x2e2f33, 0.55, 0.4, stoneC),
  metalDark: std(0x222120, 0.36, 0.85),
  bronze: std(0x4a3c2f, 0.3, 0.9),
  glassDark: std(0x0a0d11, 0.05, 0.3, null, { envMapIntensity: 1.3 }),
  glassClear: std(0x000000, 0.03, 0, null, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.6 }),
  glassTint: new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0.22, depthWrite: false }),
  plaster: std(0xd8cfc1, 0.95, 0),
  plasterCool: std(0xc9c6c0, 0.95, 0),
  darkPlaster: std(0x3a3632, 0.95, 0),
  concrete: std(0x8e8983, 0.55, 0, stoneC),
  oak: std(0xa3845f, 0.6, 0),
  walnut: std(0x4e3b2c, 0.55, 0),
  white: std(0xece8e0, 0.7, 0),
  blackMat: std(0x191919, 0.5, 0.2),
  sage: std(0x6f7a6a, 0.9, 0),
  rust: std(0x7d4f3c, 0.85, 0),
  navy: std(0x2c3646, 0.85, 0),
  sand: std(0xb9a58a, 0.9, 0),
  ceramic: std(0xe4ddd2, 0.25, 0),
  brass: std(0x8a6a3e, 0.3, 0.95),
  drawing: std(0xffffff, 0.9, 0, drawingTex),
  art1: std(0xffffff, 0.9, 0, artTex(5, '#b9b1a4', '#6e5b4a')),
  art2: std(0xffffff, 0.9, 0, artTex(6, '#2d3138', '#8a8378')),
  art3: std(0xffffff, 0.9, 0, artTex(7, '#9a8f80', '#c9c2b6')),
  lampHead: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 6.4, 3.8) }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, map: roomGrad }),
  glowFlat: new THREE.MeshBasicMaterial({ vertexColors: true }),
};
const WARM = new THREE.Color(1.0, 0.72, 0.46);
const COOL = new THREE.Color(0.62, 0.7, 0.82);

// ---------------------------------------------------------------- geometry helpers
// Box from min/max corners with metric UVs (texture tile = tm metres).
function boxMM(x0, x1, y0, y1, z0, z1, tm = 6) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const offs = [[-z1, y0], [z0, y0], [x0, -z1], [x0, z0], [x0, y0], [-x1, y0]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, (uv.getX(k) * dims[f][0] + offs[f][0]) / tm, (uv.getY(k) * dims[f][1] + offs[f][1]) / tm);
  }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
// Plane facing -x (toward the street in building-local space).
function planeFacingStreet(x, y0, y1, z0, z1) {
  const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0);
  g.rotateY(-Math.PI / 2); g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2); return g;
}
function planeUp(y, x0, x1, z0, z1) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return g;
}
function planeDown(y, x0, x1, z0, z1) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return g;
}
function planeZ(z, x0, x1, y0, y1, facingPlus) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  if (!facingPlus) g.rotateY(Math.PI);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z); return g;
}
function cyl(r, h, x, y, z, seg = 20, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, h, seg); g.translate(x, y + h / 2, z); return g;
}
function sph(r, x, y, z) { const g = new THREE.SphereGeometry(r, 20, 14); g.translate(x, y, z); return g; }
function tint(g, c, k = 1) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(mat, geo) { if (!this.map.has(mat)) this.map.set(mat, []); this.map.get(mat).push(geo); }
  build(parent) {
    for (const [mat, geos] of this.map) {
      const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
      m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m);
    }
  }
}

// ---------------------------------------------------------------- city
// Street runs along -z. Right facades at x=+6 (facing -x), left at x=-6 (mirrored).
const right = new THREE.Group(); right.position.x = 6; scene.add(right);
const left = new THREE.Group(); left.position.x = -6; left.scale.x = -1; scene.add(left);

const stores = []; // animated storefronts
const heroFloors = []; // hero building upper floors

function makeStore(B, group, spec) {
  const { z0, z1, type, stone, lights = true, fascia = M.bronze } = spec;
  const storeH = 4.6, pil = 0.7, recess = 0.45, gTop = 3.8, D = 6.6, ceil = 4.05;
  const za = z0 + pil, zb = z1 - pil, zc = (z0 + z1) / 2;
  B.add(stone, boxMM(0, 0.6, 0, storeH, z0, za));
  B.add(stone, boxMM(0, 0.6, 0, storeH, zb, z1));
  B.add(fascia, boxMM(0.02, 0.6, gTop, storeH, za, zb));
  B.add(M.metalDark, boxMM(-0.42, 0.6, gTop - 0.07, gTop, za, zb));
  B.add(stone, boxMM(recess - 0.05, recess + 0.12, 0, 0.12, za, zb));
  B.add(M.metalDark, boxMM(recess - 0.03, recess + 0.05, 0.12, 0.18, za, zb));
  // glass + mullions
  B.add(M.glassClear, planeFacingStreet(recess, 0.18, gTop, za, zb));
  B.add(M.glassTint, planeFacingStreet(recess + 0.005, 0.18, gTop, za, zb));
  const panes = 4;
  for (let i = 0; i <= panes; i++) {
    const z = lerp(za, zb, i / panes);
    B.add(M.metalDark, boxMM(recess - 0.04, recess + 0.05, 0.12, gTop, z - 0.035, z + 0.035));
  }
  B.add(M.metalDark, boxMM(recess - 0.04, recess + 0.05, gTop - 0.95, gTop - 0.9, za, zb));
  // interior shell
  const wall = spec.wall || M.plaster;
  B.add(spec.floor || M.concrete, planeUp(0.12, recess, D, za, zb));
  B.add(M.darkPlaster, planeDown(ceil, recess, D, za, zb));
  B.add(wall, planeFacingStreet(D, 0.12, ceil, za, zb));
  B.add(wall, planeZ(za, recess, D, 0.12, ceil, true));
  B.add(wall, planeZ(zb, recess, D, 0.12, ceil, false));

  const lightMat = new THREE.MeshBasicMaterial({ color: WARM.clone() });
  const canopyMat = new THREE.MeshBasicMaterial({ color: WARM.clone() });
  B.add(canopyMat, planeDown(gTop - 0.071, -0.36, -0.3, za, zb));
  // ceiling strips
  for (const x of [2.1, 4.5]) B.add(lightMat, boxMM(x - 0.05, x + 0.05, ceil - 0.04, ceil, za + 0.6, zb - 0.6));

  furnish(B, type, { recess, D, za, zb, zc, ceil, lightMat });

  const light = new THREE.PointLight(0xffd2a0, 0, 13, 2);
  light.position.set(3.4, 3.2, zc);
  if (lights) group.add(light);
  const s = { ...spec, zc, light: lights ? light : null, lightMat, canopyMat, p: 0 };
  stores.push(s);
  return s;
}

function furnish(B, type, { recess, D, za, zb, zc, ceil, lightMat }) {
  const x0 = recess + 1.2;
  if (type === 'arch') {
    // long studio table with white massing models, pendant, drawings on back wall
    B.add(M.oak, boxMM(2.7, 3.7, 0.86, 0.91, zc - 2.4, zc + 2.4));
    for (const z of [zc - 2.2, zc + 2.1]) for (const x of [2.8, 3.55]) B.add(M.metalDark, boxMM(x, x + 0.05, 0.12, 0.86, z, z + 0.05));
    const models = [[2.9, zc - 1.6, 0.35, 0.3, 0.42], [3.25, zc - 1.1, 0.25, 0.4, 0.22], [2.95, zc - 0.3, 0.5, 0.3, 0.3], [3.3, zc + 0.5, 0.3, 0.25, 0.55], [2.95, zc + 1.3, 0.4, 0.4, 0.18]];
    for (const [x, z, w, d, h] of models) B.add(M.white, boxMM(x, x + w, 0.91, 0.91 + h, z, z + d));
    B.add(lightMat, boxMM(3.15, 3.25, 2.7, 2.76, zc - 2.0, zc + 2.0));
    for (const z of [zc - 1.8, zc + 1.8]) B.add(M.blackMat, boxMM(3.19, 3.21, 2.76, ceil, z, z + 0.01));
    for (let i = 0; i < 3; i++) B.add(M.drawing, planeFacingStreet(D - 0.02, 1.5, 2.6, za + 0.8 + i * 1.65, za + 2.2 + i * 1.65));
    B.add(M.walnut, boxMM(D - 0.45, D, 0.12, 1.0, zb - 2.6, zb - 0.3));
  } else if (type === 'boutique') {
    const plinths = [[x0 + 0.6, zc - 2.2, 0.95], [x0 + 1.5, zc - 0.4, 1.15], [x0 + 0.5, zc + 1.4, 0.75]];
    for (const [x, z, h] of plinths) B.add(M.limestone, boxMM(x - 0.35, x + 0.35, 0.12, h, z - 0.35, z + 0.35));
    B.add(M.ceramic, cyl(0.13, 0.38, x0 + 0.6, 0.95, zc - 2.2, 24, 0.08));
    B.add(M.rust, boxMM(x0 + 1.32, x0 + 1.68, 1.15, 1.42, zc - 0.55, zc - 0.25));
    B.add(M.brass, sph(0.14, x0 + 0.5, 0.89, zc + 1.4));
    // clothing rail on the back wall
    B.add(M.brass, boxMM(D - 0.62, D - 0.58, 1.9, 1.94, zc - 1.2, zb - 0.4));
    const cols = [M.sand, M.navy, M.white, M.sand, M.blackMat, M.sage];
    for (let i = 0; i < 6; i++) { const z = zc - 1.0 + i * 0.42; B.add(cols[i], boxMM(D - 0.85, D - 0.35, 0.95, 1.88, z, z + 0.04)); }
    B.add(M.oak, boxMM(D - 0.4, D - 0.02, 0.12, 0.5, za + 0.3, za + 2.2));
  } else if (type === 'local') {
    // café / bakery: counter, shelves with jars, globe pendants, two tables
    B.add(M.walnut, boxMM(4.4, 5.0, 0.12, 1.02, za + 0.6, zc + 1.8));
    B.add(M.limestone, boxMM(4.35, 5.05, 1.02, 1.08, za + 0.55, zc + 1.85));
    for (const y of [1.5, 2.1, 2.7]) {
      B.add(M.oak, boxMM(D - 0.35, D - 0.02, y, y + 0.04, za + 0.4, zb - 0.4));
      for (let z = za + 0.6; z < zb - 0.6; z += 0.34 + rand() * 0.1) B.add(rand() > 0.5 ? M.ceramic : M.sand, cyl(0.07, 0.16 + rand() * 0.14, D - 0.2, y + 0.04, z, 14));
    }
    for (const z of [za + 1.2, zc, zb - 1.4]) {
      B.add(M.lampHead, sph(0.11, 3.2, 2.8, z));
      B.add(M.blackMat, boxMM(3.195, 3.205, 2.9, ceil, z, z + 0.01));
    }
    for (const z of [zb - 2.2, zb - 0.9]) {
      B.add(M.limestone, cyl(0.32, 0.03, 2.2, 0.72, z, 24));
      B.add(M.blackMat, cyl(0.03, 0.6, 2.2, 0.12, z, 8));
    }
  } else if (type === 'gallery') {
    B.add(M.art1, planeFacingStreet(D - 0.03, 1.0, 2.9, za + 0.6, za + 2.4));
    B.add(M.art2, planeFacingStreet(D - 0.03, 1.2, 2.5, zc - 0.7, zc + 0.9));
    B.add(M.art3, planeFacingStreet(D - 0.03, 0.9, 3.0, zb - 2.3, zb - 0.6));
    B.add(M.walnut, boxMM(3.2, 3.7, 0.12, 0.46, zc - 1.2, zc + 1.2));
    B.add(M.grayStone, boxMM(x0 + 0.3, x0 + 0.7, 0.12, 1.9, zb - 1.4, zb - 1.0));
  } else if (type === 'studio') {
    B.add(M.walnut, boxMM(3.0, 3.9, 0.74, 0.78, zc - 1.3, zc + 1.3));
    B.add(M.blackMat, boxMM(3.05, 3.85, 0.12, 0.74, zc - 1.25, zc - 1.2));
    B.add(M.blackMat, boxMM(3.05, 3.85, 0.12, 0.74, zc + 1.2, zc + 1.25));
    for (const z of [zc - 0.6, zc + 0.6]) B.add(M.sand, boxMM(2.4, 2.85, 0.12, 0.85, z - 0.22, z + 0.22));
    const disc = new THREE.CircleGeometry(0.85, 48); disc.rotateY(-Math.PI / 2); disc.translate(D - 0.03, 2.1, zc);
    B.add(M.brass, disc);
    B.add(M.oak, boxMM(D - 0.4, D - 0.02, 0.12, 2.6, za + 0.3, za + 1.4));
    B.add(M.blackMat, cyl(0.015, 1.6, x0 + 0.3, 0.12, zb - 0.7, 8));
    B.add(M.lampHead, sph(0.12, x0 + 0.3, 1.78, zb - 0.7));
  } else if (type === 'lobby') {
    B.add(M.limestone, boxMM(3.8, 4.6, 0.12, 1.05, zc - 1.4, zc + 1.4));
    B.add(M.art2, planeFacingStreet(D - 0.03, 1.1, 3.2, zc - 1.6, zc + 1.6));
  } else if (type === 'retail') {
    for (let i = 0; i < 3; i++) B.add(M.oak, boxMM(2.4, 3.6, 0.12, 0.8, za + 0.6 + i * 1.6, za + 1.6 + i * 1.6));
    for (let i = 0; i < 6; i++) B.add([M.sand, M.navy, M.white][i % 3], boxMM(2.6 + (i % 2) * 0.5, 2.9 + (i % 2) * 0.5, 0.8, 0.86, za + 0.8 + i * 0.75, za + 1.2 + i * 0.75));
  }
}

// Upper floors. style: 'punched' | 'ribbon' | 'fins'
function makeUpper(B, G, spec) {
  const { z0, z1, top, style, stone, litP = 0.22, hero = false } = spec;
  const y0 = 4.6, fh = style === 'ribbon' ? 3.8 : 3.6;
  const nf = Math.floor((top - y0 - 0.9) / fh);
  const yTop = y0 + nf * fh;
  // parapet + coping
  B.add(stone, boxMM(0, 0.6, yTop, top, z0, z1));
  B.add(M.metalDark, boxMM(-0.04, 0.62, top, top + 0.08, z0, z1));
  // side/end walls (visible where neighbour heights differ)
  B.add(stone, boxMM(0.6, 14, 0, top, z0, z0 + 0.3));
  B.add(stone, boxMM(0.6, 14, 0, top, z1 - 0.3, z1));

  const edge = 0.7;
  B.add(stone, boxMM(0, 0.6, y0, yTop, z0, z0 + edge));
  B.add(stone, boxMM(0, 0.6, y0, yTop, z1 - edge, z1));
  const za = z0 + edge, zb = z1 - edge;

  for (let f = 0; f < nf; f++) {
    const fy = y0 + f * fh;
    if (style === 'ribbon') {
      const sp = 1.0;
      B.add(stone, boxMM(0, 0.6, fy, fy + sp, za, zb));
      const gy0 = fy + sp, gy1 = fy + fh;
      const lit = hero || rand() < litP + 0.15;
      const k = hero ? 1 : rr(0.35, 1.0);
      const heroMat = hero ? new THREE.MeshBasicMaterial({ color: WARM.clone(), map: roomGrad }) : null;
      addRoom(B, 0.35, gy0, gy1, za, zb, lit, k, heroMat, 7.0);
      for (let z = za; z <= zb + 1e-3; z += (zb - za) / Math.round((zb - za) / 1.5)) B.add(M.metalDark, boxMM(0.3, 0.4, gy0, gy1, z - 0.03, z + 0.03));
      if (hero) {
        const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE_HEX), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        B.add(lineMat, planeFacingStreet(-0.005, fy + sp - 0.035, fy + sp - 0.005, za, zb));
        // desks in silhouette
        for (let z = za + 1.0; z < zb - 1.0; z += 2.3) B.add(M.blackMat, boxMM(2.4, 3.4, gy0, gy0 + 0.75, z, z + 1.5));
        const stripMat = new THREE.MeshBasicMaterial({ color: WARM.clone() });
        for (const x of [1.6, 3.6, 5.6]) B.add(stripMat, boxMM(x - 0.04, x + 0.04, gy1 + 0.13, gy1 + 0.17, za + 0.5, zb - 0.5));
        for (let z = za + 0.6; z < zb - 1.2; z += 3.1) {
          B.add(M.walnut, boxMM(6.55, 6.95, gy0, gy0 + 2.1, z, z + 1.8));
          B.add(M.blackMat, boxMM(6.5, 6.55, gy0 + 1.0, gy0 + 1.04, z, z + 1.8));
        }
        B.add(M.sand, boxMM(1.4, 1.9, gy0, gy0 + 0.45, za + 3.1, za + 5.2));
        heroFloors.push({ mat: heroMat, lineMat, stripMat, y: (gy0 + gy1) / 2, fy });
      }
    } else {
      const bays = Math.max(2, Math.round((zb - za) / (style === 'fins' ? 1.5 : 2.4)));
      const bw = (zb - za) / bays, pier = style === 'fins' ? 0.12 : 0.55, sp = style === 'fins' ? 0.7 : 1.05;
      B.add(stone, boxMM(0, 0.6, fy, fy + sp, za, zb));
      for (let b = 0; b < bays; b++) {
        const wz0 = za + b * bw + pier / 2, wz1 = za + (b + 1) * bw - pier / 2;
        const lit = rand() < litP;
        addRoom(B, 0.4, fy + sp, fy + fh, wz0, wz1, lit, rr(0.25, 1.0), null, 4.0);
        if (style === 'fins') B.add(M.metalDark, boxMM(-0.35, 0.6, fy + sp, fy + fh, za + b * bw - pier / 2, za + b * bw + pier / 2));
      }
      if (style !== 'fins') for (let b = 0; b <= bays; b++) {
        const z = za + b * bw;
        B.add(stone, boxMM(0, 0.6, fy + sp, fy + fh, Math.max(za, z - pier / 2), Math.min(zb, z + pier / 2)));
      }
      if (style === 'fins') B.add(M.metalDark, boxMM(-0.35, 0.6, fy + sp, fy + fh, zb - pier / 2, zb));
    }
  }
}

// A window opening: dark reflective glass, or clear glass onto a softly lit room.
function addRoom(B, gx, y0, y1, z0, z1, lit, k, heroMat, depth) {
  if (!lit && !heroMat) { B.add(M.glassDark, planeFacingStreet(gx, y0, y1, z0, z1)); return; }
  B.add(M.glassClear, planeFacingStreet(gx, y0, y1, z0, z1));
  B.add(M.glassTint, planeFacingStreet(gx + 0.005, y0, y1, z0, z1));
  const bx = gx + depth;
  const warm = new THREE.Color().copy(WARM).lerp(new THREE.Color(1, 0.9, 0.78), rand() * 0.6);
  if (heroMat) {
    B.add(heroMat, planeFacingStreet(bx, y0, y1 + 0.2, z0, z1));
  } else {
    B.add(M.glow, tint(planeFacingStreet(bx, y0, y1 + 0.2, z0, z1), warm, 0.55 * k));
  }
  const kk = heroMat ? 0.4 : 0.4 * k;
  B.add(M.glowFlat, tint(planeDown(y1 + 0.2, gx, bx, z0, z1), warm, kk * 0.55));
  B.add(M.glowFlat, tint(planeUp(y0, gx, bx, z0, z1), warm, kk * 0.18));
  B.add(M.glowFlat, tint(planeZ(z0, gx, bx, y0, y1 + 0.2, true), warm, kk * 0.4));
  B.add(M.glowFlat, tint(planeZ(z1, gx, bx, y0, y1 + 0.2, false), warm, kk * 0.4));
  if (!heroMat && rand() < 0.4) {
    const by = lerp(y1, y0, rr(0.25, 0.6));
    B.add(M.glowFlat, tint(planeFacingStreet(gx + 0.08, by, y1, z0, z1), warm, 0.45 * k));
  }
  if (!heroMat && rand() < 0.5) B.add(M.glowFlat, tint(boxMM(bx * 0.5 - 0.05, bx * 0.5 + 0.05, y1 + 0.15, y1 + 0.19, z0 + 0.2, z1 - 0.2), warm, 3.2 * k));
}

// Right side — the storefronts we follow.
const rightB = new Bucket();
const RIGHT = [
  { zc: 6, type: 'lobby', top: 19.5, style: 'punched', stone: M.grayStone, lights: false },
  { zc: -6, type: 'boutique', top: 22.3, style: 'punched', stone: M.limestone },
  { zc: -18, type: 'local', top: 16.9, style: 'fins', stone: M.warmStone },
  { zc: -30, type: 'gallery', top: 20.4, style: 'punched', stone: M.grayStone, fascia: M.metalDark },
  { zc: -42, type: 'arch', top: 17.2, style: 'ribbon', stone: M.limestone, hero: true },
  { zc: -54, type: 'studio', top: 23.5, style: 'fins', stone: M.charcoal },
  { zc: -66, type: 'retail', top: 18.5, style: 'punched', stone: M.warmStone, lights: false },
  { zc: -78, type: 'boutique', top: 21, style: 'punched', stone: M.limestone, lights: false },
  { zc: -90, type: 'local', top: 17, style: 'fins', stone: M.grayStone, lights: false },
  { zc: -102, type: 'gallery', top: 24, style: 'punched', stone: M.warmStone, lights: false },
];
const R = {};
RIGHT.forEach((b, i) => {
  const z0 = b.zc - 6, z1 = b.zc + 6;
  const s = makeStore(rightB, right, { ...b, z0, z1, side: 'R', idx: i });
  makeUpper(rightB, right, { z0, z1, top: b.top, style: b.style, stone: b.stone, hero: !!b.hero, litP: 0.2 });
  R[i] = s;
});
rightB.build(right);

const leftB = new Bucket();
const LEFT = [
  { zc: 5.5, w: 13, type: 'retail', top: 21, style: 'punched', stone: M.warmStone },
  { zc: -7.5, w: 13, type: 'studio', top: 25, style: 'fins', stone: M.charcoal },
  { zc: -20.5, w: 13, type: 'local', top: 18, style: 'punched', stone: M.limestone },
  { zc: -33.5, w: 13, type: 'boutique', top: 22, style: 'punched', stone: M.grayStone },
  { zc: -46.5, w: 13, type: 'gallery', top: 19, style: 'fins', stone: M.warmStone },
  { zc: -59.5, w: 13, type: 'retail', top: 24, style: 'punched', stone: M.limestone },
  { zc: -72.5, w: 13, type: 'studio', top: 20, style: 'punched', stone: M.grayStone },
  { zc: -85.5, w: 13, type: 'local', top: 23, style: 'fins', stone: M.charcoal },
  { zc: -98.5, w: 13, type: 'boutique', top: 18, style: 'punched', stone: M.warmStone },
];
LEFT.forEach((b, i) => {
  const z0 = b.zc - b.w / 2, z1 = b.zc + b.w / 2;
  makeStore(leftB, left, { ...b, z0, z1, side: 'L', idx: i, lights: i < 4 });
  makeUpper(leftB, left, { z0, z1, top: b.top, style: b.style, stone: b.stone, litP: 0.24 });
});
leftB.build(left);

// Far skyline beyond the street, dissolving into fog.
{
  const B = new Bucket();
  const r = mulberry32(77);
  for (let i = 0; i < 16; i++) {
    const x = -40 + r() * 80, z = -150 - r() * 90, w = 8 + r() * 14, h = 20 + r() * 55;
    B.add(M.charcoal, boxMM(x - w / 2, x + w / 2, 0, h, z - w / 2, z + w / 2));
    for (let k = 0; k < 10; k++) {
      const wy = 3 + r() * (h - 6), wx = x - w / 2 + r() * (w - 2);
      const g = new THREE.PlaneGeometry(1.2, 0.8); g.translate(wx + 0.6, wy, z + w / 2 + 0.05);
      B.add(M.glowFlat, tint(g, WARM, 0.8 + r()));
    }
  }
  B.build(scene);
}
// Closing the street far end on the sides (beyond z=-108).
{
  const B = new Bucket();
  B.add(M.grayStone, boxMM(6, 20, 0, 22, -140, -108));
  B.add(M.warmStone, boxMM(-20, -6, 0, 19, -140, -105));
  B.build(scene);
}

// Street furniture: slim lamp posts + stone benches.
const lampLights = [];
{
  const B = new Bucket();
  const posts = [];
  for (let z = 2; z > -112; z -= 18) posts.push([-4.7, z]);
  for (let z = 0; z > -112; z -= 24) posts.push([4.7, z]);
  for (const [x, z] of posts) {
    B.add(M.metalDark, cyl(0.045, 5.2, x, 0, z, 10));
    B.add(M.metalDark, boxMM(x - 0.09, x + 0.09, 5.2, 5.28, z - 0.3, z + 0.3));
    B.add(M.lampHead, boxMM(x - 0.06, x + 0.06, 5.17, 5.2, z - 0.24, z + 0.24));
    if (z > -64) {
      const L = new THREE.PointLight(0xffcf9a, 16, 12, 2); L.position.set(x, 4.9, z); scene.add(L); lampLights.push(L);
    }
  }
  for (const z of [-12, -37, -61, -86]) B.add(M.limestone, boxMM(0.9, 1.45, 0, 0.46, z - 1.8, z + 1.8));
  B.build(scene);
}

// Wet paving: mirror underneath + semi-opaque stone on top.
const reflector = new Reflector(new THREE.PlaneGeometry(40, 280), {
  textureWidth: Math.round(W * 0.34), textureHeight: Math.round(H * 0.34), color: 0x55585d, clipBias: 0.003,
});
reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, 0, -90);
scene.add(reflector);
{
  const g = new THREE.PlaneGeometry(40, 280);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 40 / 4.8, uv.getY(i) * 280 / 4.8);
  const mat = new THREE.MeshStandardMaterial({
    map: pavingTex, color: 0x9a9690, roughness: 0.32, metalness: 0,
    transparent: true, opacity: 0.78, alphaMap: wetTex, envMapIntensity: 0.4,
  });
  mat.alphaMap.repeat.set(0.35, 0.35);
  const paving = new THREE.Mesh(g, mat);
  paving.rotation.x = -Math.PI / 2; paving.position.set(0, 0.004, -90);
  scene.add(paving);
}

// The Fentra pulse: a linear light set into the paving along the storefront threshold.
const BLUE = new THREE.Color(BLUE_HEX);
const pulseMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { head: { value: 999 }, color: { value: BLUE.clone() }, base: { value: 0 }, gain: { value: 1 } },
  vertexShader: `varying float vz; void main(){ vec4 w = modelMatrix*vec4(position,1.); vz = w.z; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `
    uniform float head, base, gain; uniform vec3 color; varying float vz;
    void main(){
      float d = vz - head;
      float I = d > 0. ? (exp(-d/5.0)*7.0 + exp(-d/28.)*0.9 + base) : exp(d*3.5)*7.0;
      gl_FragColor = vec4(color*I*gain, 1.);
    }`,
});
{
  const g = new THREE.PlaneGeometry(0.045, 200); g.rotateX(-Math.PI / 2); g.translate(5.2, 0.008, -90);
  scene.add(new THREE.Mesh(g, pulseMat));
}
const pulseLight = new THREE.PointLight(BLUE, 0, 9, 2); pulseLight.position.set(5.0, 0.35, 0); scene.add(pulseLight);

// ---------------------------------------------------------------- post
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.42, 0.72, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, fade: { value: 1 }, vig: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float fade, vig; varying vec2 vUv;
    void main(){
      vec2 d = vUv - 0.5;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv - d*0.0022).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv + d*0.0022).b;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, 0.86);                                      // restrained saturation
      c *= mix(vec3(0.985,1.0,1.03), vec3(1.035,1.0,0.955), smoothstep(0.15,0.75,l)); // cool shadows / warm highlights
      c = c*0.965 + vec3(0.017,0.015,0.013);                           // warm, lifted black
      c = mix(c, c*c*(3.0-2.0*c), 0.18);                               // gentle S-curve
      float v = length(d*vec2(0.62,1.0))*1.35;
      c *= mix(1.0, smoothstep(1.05,0.25,v)*0.55+0.45, vig);
      gl_FragColor = vec4(c*fade, 1.);
    }`,
});
composer.addPass(grade);

// ---------------------------------------------------------------- timeline
const SHOT1 = { t0: 0, t1: 4.4, fov: 54.4, p0: [-1.8, 1.62, 10.5], p1: [-0.7, 1.7, 3.6], l0: [4.3, 3.0, -17], l1: [4.9, 3.1, -23] };
const SHOT3 = { t0: 8.1, t1: 12.0, fov: 54.4, p0: [-3.9, 1.55, -18.5], p1: [-3.0, 1.64, -28.8], l0: [6, 2.6, -31.5], l1: [6, 2.8, -43.5] };
const SHOT4 = { t0: 12.0, t1: 16.4, fov: 46, p0: [-3.4, 1.7, -33.6], p1: [-2.4, 4.3, -35.6], l0: [6, 3.3, -42.8], l1: [6, 7.1, -42.8] };

function camPose(S, t) {
  const u = clamp((t - S.t0) / (S.t1 - S.t0));
  const e = 0.45 * u + 0.55 * easeIO(u); // already in motion at the cut, settles smoothly
  const p = lerp3(S.p0, S.p1, e), l = lerp3(S.l0, S.l1, e);
  // barely-there physical drift (dolly on a track, not handheld)
  p[0] += Math.sin(t * 0.9 + 1.3) * 0.012; p[1] += Math.sin(t * 1.3) * 0.008;
  camera.position.set(...p); camera.lookAt(...l);
  camera.fov = S.fov; camera.updateProjectionMatrix();
}

// Pulse head travels down the street in shot 3.
const PULSE_T0 = 8.25, PULSE_T1 = 11.2, PULSE_Z0 = -6, PULSE_Z1 = -64;
function pulseHead(t) {
  if (t < PULSE_T0) return 999;
  return lerp(PULSE_Z0, PULSE_Z1, (t - PULSE_T0) / (PULSE_T1 - PULSE_T0));
}
function pulseTimeAt(z) { return PULSE_T0 + (z - PULSE_Z0) / (PULSE_Z1 - PULSE_Z0) * (PULSE_T1 - PULSE_T0); }

const TARGET = { 1: 0.72, 2: 0.66, 3: 0.2, 4: 1.0, 5: 0.6 }; // idx 3 (gallery) stays unnoticed
function presenceAt(s, t) {
  const base = s.side === 'L' ? 0.14 + (s.idx % 3) * 0.03 : 0.2;
  if (s.side === 'R' && TARGET[s.idx] !== undefined) {
    const tp = pulseTimeAt(s.zc + 3.5);
    return lerp(base, TARGET[s.idx], sstep(tp, tp + 0.7, t));
  }
  return base;
}
const tmpC = new THREE.Color();
function applyStore(s, p) {
  tmpC.copy(COOL).lerp(WARM, clamp(p * 1.3));
  s.lightMat.color.copy(tmpC).multiplyScalar(lerp(0.7, 3.6, p));
  s.canopyMat.color.copy(WARM).multiplyScalar(lerp(0.0, 1.7, sstep(0.35, 1, p)));
  if (s.light) { s.light.intensity = lerp(3, 34, p); s.light.color.copy(tmpC); }
}

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const el = {
  s1: $('s1'), s2a: $('s2a'), s2b: $('s2b'), s3a: $('s3a'), s3b: $('s3b'), s4: $('s4'),
  ui: $('ui'), panel: $('panel'), q: [...document.querySelectorAll('.q i')], caret: document.querySelector('.caret'),
  scan: document.querySelector('.scan'), cards: [$('c0'), $('c1'), $('c2')], dot: document.querySelector('#c1 .dot'),
  rail: document.querySelector('.railPulse'),
  labs: [$('lab0'), $('lab1'), $('lab2')], spine: $('spine'), lines: $('lines'),
  endBg: $('endBg'), logoSlot: $('logoSlot'), services: $('services'), tag1: $('tag1'), tag2: $('tag2'), handle: $('handle'),
  hairline: $('hairline'), grain: $('grain'),
};

function textIn(e, t, a, b, c, d, rise = 14) {
  const o = win(t, a, b, c, d);
  const inP = sstep(a, b, t), outP = sstep(c, d, t);
  e.style.opacity = o.toFixed(4);
  e.style.transform = `translateY(${((1 - easeOut(inP)) * rise - outP * rise * 0.4).toFixed(2)}px)`;
  const blur = (1 - inP) * 8 + outP * 6;
  e.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
}

// Film grain tiles, cycled deterministically per frame.
const grainURLs = [];
for (let k = 0; k < 6; k++) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); const img = g.createImageData(512, 512); const r = mulberry32(900 + k);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r(); const on = v > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = on; img.data[i + 3] = Math.abs(v - 0.5) * 2 * 255;
  }
  g.putImageData(img, 0, 0); grainURLs.push(c.toDataURL());
}

const project = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];
};

// WEB/SEO/GEO anchors: the hero's near pilaster edge (world coords), one per level.
const HERO_EDGE_Z = -44.4;
const ANCHORS = [[6.0 - 0.02, 2.2, HERO_EDGE_Z], [6.0 - 0.02, 6.35, HERO_EDGE_Z], [6.0 - 0.02, 10.15, HERO_EDGE_Z]];
const LAB_T = [12.45, 13.05, 13.65];

// ---------------------------------------------------------------- thumbnails for the discovery cards
function renderThumbs() {
  const shots = [
    { p: [0.2, 1.7, -12], l: [6, 2.1, -18.5], store: 2 },
    { p: [0.4, 2.1, -36.4], l: [6, 2.5, -42], store: 4 },
    { p: [0.3, 1.7, -48.5], l: [6, 2.2, -54], store: 5 },
  ];
  const cams = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  renderer.setScissorTest(true);
  shots.forEach((sh, i) => {
    stores.forEach((s) => applyStore(s, s.side === 'R' && s.idx === sh.store ? 0.9 : 0.25));
    pulseMat.uniforms.head.value = 999;
    cams.position.set(...sh.p); cams.lookAt(...sh.l);
    renderer.setViewport(0, 0, 256, 256); renderer.setScissor(0, 0, 256, 256);
    renderer.setRenderTarget(null);
    renderer.render(scene, cams);
    const dst = el.cards[i].querySelector('canvas').getContext('2d');
    dst.filter = 'saturate(0.8) contrast(1.05)';
    dst.drawImage(renderer.domElement, 0, H - 256, 256, 256, 0, 0, 256, 256);
  });
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
}

// ---------------------------------------------------------------- frame
let lastGrain = -1;
function renderAt(t) {
  // --- which camera
  if (t < SHOT3.t0) camPose(SHOT1, Math.min(t, 7.0)); // shot 2 shows shot-1 world, defocused, behind the UI
  else if (t < SHOT4.t0) camPose(SHOT3, t);
  else camPose(SHOT4, t);

  // --- stores & pulse
  for (const s of stores) {
    let p = presenceAt(s, t);
    if (s.side === 'R' && s.idx === 4 && t >= SHOT4.t0) p = 1;
    applyStore(s, p);
  }
  const head = pulseHead(t);
  pulseMat.uniforms.head.value = head;
  pulseMat.uniforms.base.value = t > PULSE_T0 ? 0.28 : 0;
  pulseMat.uniforms.gain.value = t < SHOT4.t0 ? 1 : 0.55;
  pulseLight.intensity = t > PULSE_T0 && t < PULSE_T1 + 0.4 ? 10 * (1 - sstep(PULSE_T1 - 0.2, PULSE_T1 + 0.4, t)) : 0;
  pulseLight.position.z = Math.max(head, -70) + 1.2;

  // hero floors: dim until shot 4, then light in sequence with WEB → SEO → GEO
  heroFloors.forEach((f, i) => {
    const on = i < 2 ? sstep(LAB_T[i + 1] - 0.1, LAB_T[i + 1] + 0.6, t) : sstep(14.2, 14.9, t) * 0.55;
    const sync = win(t, 14.25, 14.55, 14.9, 15.6) * 0.25;
    f.mat.color.copy(WARM).multiplyScalar(lerp(0.16, 0.8, on) + sync);
    f.stripMat.color.copy(WARM).multiplyScalar(lerp(0.25, 3.2, on));
    const lo = i < 2 ? win(t, LAB_T[i + 1] - 0.05, LAB_T[i + 1] + 0.35, 15.7, 16.2) : 0;
    f.lineMat.opacity = lo * 0.9;
  });

  // --- exposure / transitions
  let fade = 1, vig = 1;
  fade *= lerp(0.0, 1, sstep(0.0, 0.9, t));                // open from black
  if (t < SHOT3.t0) fade *= 1 - sstep(3.75, 4.4, t) * 0.62; // shot 1 → UI
  if (t >= SHOT3.t0 && t < SHOT4.t0) fade *= sstep(SHOT3.t0, SHOT3.t0 + 0.45, t);
  if (t >= SHOT4.t0) fade *= 1 - sstep(15.85, 16.45, t);    // → brand reveal
  grade.uniforms.fade.value = fade; grade.uniforms.vig.value = vig;

  const uiBlur = t < SHOT3.t0 ? sstep(3.7, 4.4, t) * 22 : 0;
  canvas.style.filter = uiBlur > 0.05 ? `blur(${uiBlur.toFixed(1)}px)` : 'none';
  canvas.style.opacity = t < SHOT3.t0 ? (1 - sstep(7.7, 8.05, t)).toFixed(3) : '1';

  if (t < 16.6) composer.render();
  else { renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear(); }

  // --- statements
  textIn(el.s1, t, 0.75, 1.45, 3.35, 3.85);
  textIn(el.s2a, t, 4.45, 4.95, 5.8, 6.15);
  textIn(el.s2b, t, 6.3, 6.8, 7.6, 7.95);
  textIn(el.s3a, t, 8.55, 9.05, 9.75, 10.05);
  textIn(el.s3b, t, 10.2, 10.7, 11.55, 11.9);
  textIn(el.s4, t, 14.45, 14.95, 15.65, 15.95, 10);

  // --- discovery interface
  const uiO = win(t, 4.0, 4.55, 7.7, 8.05);
  el.ui.style.opacity = uiO.toFixed(4);
  if (uiO > 0) {
    const u = clamp((t - 4.0) / 4.05);
    const push = sstep(7.7, 8.05, t);
    el.panel.style.transform = `translateY(${lerp(34, -10, easeIO(u)).toFixed(2)}px) rotateX(${lerp(11, 5, u).toFixed(3)}deg) rotateY(${lerp(-7, -3, u).toFixed(3)}deg) scale(${(lerp(0.975, 1.02, u) + push * 0.05).toFixed(4)})`;
    el.panel.style.filter = (1 - sstep(4.0, 4.6, t)) * 10 + push * 8 > 0.05 ? `blur(${((1 - sstep(4.0, 4.6, t)) * 10 + push * 8).toFixed(2)}px)` : 'none';
    const qw = [150, 96, 176], qs = [4.72, 4.98, 5.2];
    el.q.forEach((q, i) => { q.style.width = `${(qw[i] * easeOut(sstep(qs[i], qs[i] + 0.2, t))).toFixed(1)}px`; });
    el.caret.style.opacity = (Math.floor(t * 2.4) % 2 === 0 || (t > 4.6 && t < 5.45)) ? '1' : '0.15';
    el.scan.style.width = `${(840 * easeIO(sstep(5.45, 6.0, t))).toFixed(1)}px`;
    el.scan.style.opacity = (1 - sstep(6.1, 6.6, t) * 0.7).toFixed(3);
    const ct = [5.7, 5.86, 6.02];
    const found = sstep(6.35, 6.85, t);
    el.cards.forEach((c, i) => {
      const a = easeOut(sstep(ct[i], ct[i] + 0.4, t));
      const dim = i === 1 ? 1 : 1 - found * 0.5;
      c.style.opacity = (a * dim).toFixed(4);
      const lift = i === 1 ? found : 0;
      c.style.transform = `translateY(${((1 - a) * 26).toFixed(2)}px) translateX(${(lift * 14).toFixed(2)}px) scale(${(1 + lift * 0.025).toFixed(4)})`;
      c.style.borderColor = i === 1 ? `rgba(28,115,253,${(0.09 + found * 0.6).toFixed(3)})` : 'rgba(255,255,255,0.09)';
      c.style.boxShadow = i === 1 ? `0 24px 60px rgba(0,0,0,0.45), 0 0 ${(found * 60).toFixed(1)}px rgba(28,115,253,${(found * 0.22).toFixed(3)})` : '0 24px 60px rgba(0,0,0,0.45)';
    });
    el.dot.style.opacity = found.toFixed(3);
    // blue pulse descending the rail and resolving on the found card
    const rp = sstep(6.0, 6.55, t);
    el.rail.style.top = `${lerp(-180, 250, easeIO(rp)).toFixed(1)}px`;
    el.rail.style.opacity = (1 - sstep(6.9, 7.5, t) * 0.6).toFixed(3);
  }

  // --- WEB / SEO / GEO
  const labO = t >= SHOT4.t0 ? 1 - sstep(15.75, 16.1, t) : 0;
  const pts = ANCHORS.map((a) => project(...a));
  el.labs.forEach((lab, i) => {
    const a = sstep(LAB_T[i], LAB_T[i] + 0.45, t) * labO * (1 - sstep(14.35, 14.8, t) * 0.45);
    lab.style.opacity = a.toFixed(4);
    const [x, y] = pts[i];
    lab.style.transform = `translate(${(x - 4.5).toFixed(1)}px, ${(y - 22).toFixed(1)}px)`;
    lab.querySelector('.ld').style.transform = `scaleX(${easeOut(sstep(LAB_T[i], LAB_T[i] + 0.5, t)).toFixed(3)})`;
    lab.querySelector('.tx').style.opacity = sstep(LAB_T[i] + 0.12, LAB_T[i] + 0.5, t).toFixed(3);
  });
  // spine: grows upward through the three levels (one system), then becomes the brand hairline
  const grow = t >= SHOT4.t0 ? sstep(LAB_T[0] + 0.1, LAB_T[2] + 0.35, t) : 0;
  const HAIR_Y = 1000, HAIR_X0 = 470, HAIR_X1 = 610;
  const m = sstep(15.95, 16.7, t);
  const mE = easeIO(m);
  const [bx, by] = pts[0], [tx, ty] = pts[2];
  const topY = lerp(by, ty, grow), topX = lerp(bx, tx, grow);
  const x1 = lerp(bx, HAIR_X0, mE), y1 = lerp(by, HAIR_Y, mE), x2 = lerp(topX, HAIR_X1, mE), y2 = lerp(topY, HAIR_Y, mE);
  const spineO = t >= SHOT4.t0 && t < 16.8 ? Math.min(1, grow * 3) * 0.95 : 0;
  el.spine.setAttribute('x1', x1.toFixed(1)); el.spine.setAttribute('y1', y1.toFixed(1));
  el.spine.setAttribute('x2', x2.toFixed(1)); el.spine.setAttribute('y2', y2.toFixed(1));
  el.spine.style.opacity = spineO.toFixed(3);
  el.spine.style.strokeWidth = lerp(2, 2.5, m).toFixed(2);

  // --- brand reveal + end frame
  el.endBg.style.opacity = sstep(16.05, 16.6, t).toFixed(4);
  el.hairline.setAttribute('x1', HAIR_X0); el.hairline.setAttribute('x2', HAIR_X1);
  el.hairline.setAttribute('y1', HAIR_Y); el.hairline.setAttribute('y2', HAIR_Y);
  el.hairline.style.opacity = t >= 16.8 ? '0.95' : '0';
  el.hairline.style.strokeWidth = '2.5';
  const lo = sstep(16.45, 17.0, t);
  el.logoSlot.style.opacity = lo.toFixed(4);
  el.logoSlot.style.transform = `translateY(${((1 - easeOut(lo)) * 10).toFixed(2)}px)`;
  el.logoSlot.style.filter = lo < 0.999 ? `blur(${((1 - lo) * 6).toFixed(2)}px)` : 'none';
  textIn(el.services, t, 16.7, 17.15, 17.85, 18.2, 8);
  textIn(el.tag1, t, 16.95, 17.45, 17.85, 18.2, 10);
  textIn(el.tag2, t, 18.2, 18.75, 99, 100, 10);
  textIn(el.handle, t, 18.5, 19.0, 99, 100, 6);

  // --- grain
  const gf = Math.floor(t * 24);
  if (gf !== lastGrain) {
    lastGrain = gf;
    const r = mulberry32(gf * 7 + 1);
    el.grain.style.backgroundImage = `url(${grainURLs[gf % grainURLs.length]})`;
    el.grain.style.backgroundPosition = `${Math.floor(r() * 512)}px ${Math.floor(r() * 512)}px`;
  }
}

// ---------------------------------------------------------------- boot
async function boot() {
  // Real logo: drop assets/fentra-logo.svg (or .png) and it is used as-is, never redrawn.
  for (const f of ['../assets/fentra-logo.svg', '../assets/fentra-logo.png']) {
    try {
      const r = await fetch(f, { method: 'HEAD' });
      if (r.ok) { const img = $('logo'); img.src = f; img.style.display = 'block'; await img.decode(); break; }
    } catch (e) { /* no logo supplied */ }
  }
  await document.fonts.load('300 78px "Inter Tight"', 'İyi olmak yetmez. Müşteriler ğüşıöç');
  await document.fonts.load('400 27px "Inter Tight"', '@fentra.digital');
  await document.fonts.load('500 34px "Inter Tight"', 'WEB SEO GEO •');
  await document.fonts.ready;
  renderThumbs();
  renderAt(0);
  window.renderAt = (t) => { renderAt(t); return true; };
  window.filmReady = true;
}
boot();
