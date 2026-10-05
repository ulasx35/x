// Episode 5 world: the city of episodes 1-4 (sign, building, road, lock, mailboxes, the shop, the CDN branches),
// plus a safe with the spare key. Backup = the spare key in a safe; off-site copy = a second safe on a cloud;
// untested backup = a key that doesn't fit; updates = keeping the lock on the door new.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, lerp, prog, smooth, inOut, outCubic, outBack, outExpo, win, rng, hash } from './anim.js';
import { T } from './timeline.js';

export const W = 1080, H = 1920;
export const BLUE = new THREE.Color('#1c73fd');
const PITCH = 28, HALF = 10, N = 5;                     // blocks 20×20 on a 28 grid, 9×9 blocks
const EDGE = N * PITCH + HALF;                          // city edge (±122)
const HERO = new THREE.Vector3(0, 0, -1);               // hero building centre
const NEWB = new THREE.Vector3(28, 0, -57);             // the new hosting (block 1,-2)
const GATE = new THREE.Vector3(-42, 0, 4 * PITCH + HALF - 4);       // where visitors enter the city
const SIGN_A = new THREE.Vector3(-5.6, 0, 8.4);
const SIGN_B = new THREE.Vector3(22.4, 0, -47.6);
const SHOP = new THREE.Vector3(7.6, 0.3, 22);                        // the shop next door, at the edge of the square
const BRANCH = [[28, -84], [-28, -28], [-28, 56], [28, 56]];        // CDN branches
const FARV = [[42, -98], [-42, -42], [-14, 70], [42, 70]];          // far-away visitors, one near each branch
const SHORT = FARV.map(([x, z], k) => [[x, z], [x, BRANCH[k][1]], [BRANCH[k][0] + Math.sign(x - BRANCH[k][0]) * 4.5, BRANCH[k][1]]]);
const SAFE1 = new THREE.Vector3(-5, 0.32, 19.5);                      // the safe with the spare key, on the square
const CLOUD = new THREE.Vector3(-7, 15, 15);                          // the second copy, up on a cloud

// ------------------------------------------------------------------ renderer
const Q = new URLSearchParams(location.search);
export function createCity(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !Q.has('noaa'), preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !Q.has('noshadow');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const NIGHT_BG = new THREE.Color('#0b1222'), DAY_BG = new THREE.Color('#9db8d8');
  scene.background = NIGHT_BG.clone();
  scene.fog = new THREE.FogExp2(NIGHT_BG.clone(), 0.0046);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;

  const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 1400);
  const skyU = { uDay: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uDay; varying vec3 vD;
      void main(){ float h = clamp(vD.y, -0.2, 1.0);
        vec3 night = mix(vec3(0.075,0.11,0.2), vec3(0.012,0.02,0.04), smoothstep(0.0, 0.45, h));
        night += vec3(0.1,0.16,0.3) * exp(-pow(h/0.06, 2.0)) * 0.6;
        vec3 day = mix(vec3(0.72,0.8,0.9), vec3(0.34,0.52,0.8), smoothstep(0.0, 0.5, h));
        gl_FragColor = vec4(mix(night, day, uDay), 1.0); }`,
  }));
  scene.add(sky);

  // lights
  const hemi = new THREE.HemisphereLight('#6f8fcf', '#07090f', 0.55);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight('#b4c8ff', 1.25);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 420 });
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.4;
  scene.add(moon, moon.target);
  const heroGlow = new THREE.PointLight(BLUE, 0, 40, 1.6);
  heroGlow.position.set(0, 6, 4);
  scene.add(heroGlow);
  const R = rng(20260927);

  // ---------------------------------------------------------------- ground, blocks, grid glow
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: '#0a0e15', roughness: 0.92, metalness: 0.0 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const blocks = [];
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) blocks.push({ i, j, x: i * PITCH, z: j * PITCH });
  const walkGeo = new THREE.BoxGeometry(2 * HALF, 0.3, 2 * HALF); walkGeo.translate(0, 0.15, 0);
  const walks = new THREE.InstancedMesh(walkGeo, new THREE.MeshStandardMaterial({ color: '#131a26', roughness: 0.85 }), blocks.length);
  const m4 = new THREE.Matrix4();
  blocks.forEach((b, k) => { m4.makeTranslation(b.x, 0, b.z); walks.setMatrixAt(k, m4); });
  walks.receiveShadow = true;
  scene.add(walks);

  // glowing curb lines, revealed by a wave from the hero block
  const gridMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uWave: { value: 0 }, uBase: { value: 0 }, uFlash: { value: 0 }, uRing: { value: -100 }, uRingC: { value: new THREE.Vector2(NEWB.x, NEWB.z) }, uColor: { value: BLUE.clone() } },
    vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform float uWave, uBase, uFlash, uRing; uniform vec2 uRingC; uniform vec3 uColor; varying vec2 vP;
      float edgeLine(vec2 p){
        vec2 l = mod(p + 14.0, 28.0) - 14.0;
        vec2 d = abs(abs(l) - 10.0);
        float inX = step(abs(l.y), 10.0), inZ = step(abs(l.x), 10.0);
        float lx = exp(-d.x*d.x*9.0) * inX, lz = exp(-d.y*d.y*9.0) * inZ;
        return max(lx, lz);
      }
      void main(){
        float r = length(vP);
        float line = edgeLine(vP) * step(abs(vP.x), 150.5) * step(abs(vP.y), 150.5);
        float front = exp(-pow((r - uWave)/9.0, 2.0));
        float inside = smoothstep(uWave + 2.0, uWave - 6.0, r);
        float rr = length(vP - uRingC);
        float ring = exp(-pow((rr - uRing)/7.0, 2.0)) * smoothstep(200.0, 30.0, rr);
        float fade = exp(-r*0.006);
        float k = line * (uBase*inside*fade + front*1.6 + uFlash*fade) + line*ring*2.2 + ring*0.22;
        gl_FragColor = vec4(uColor * k, 1.0);
      }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.y = 0.34;
  scene.add(grid);

  // ---------------------------------------------------------------- city buildings (instanced, procedural windows)
  const bld = [], parks = [];
  for (const b of blocks) {
    if (b.i === 0 && b.j === 0) continue;               // hero block
    if (b.i === 0 && b.j === 1) { parks.push(b); continue; } // a park in front of the hero keeps the view open
    const low = (Math.abs(b.i) <= 1 && b.j >= 0 && b.j <= 1) || (b.i === 1 && b.j === -1);
    const lots = R() < 0.35 ? [[0, 0, 16, 16]] : R() < 0.5 ? [[-4.6, 0, 8.4, 16], [4.6, 0, 8.4, 16]] : [[-4.6, -4.6, 8.4, 8.4], [4.6, -4.6, 8.4, 8.4], [-4.6, 4.6, 8.4, 8.4], [4.6, 4.6, 8.4, 8.4]];
    for (const [ox, oz, w, d] of lots) {
      if (R() < 0.12) continue;
      if (b.i === -2 && b.j === 2 && ox >= 0) continue;   // the café sits here, on the route's street
      const near = Math.hypot(b.x, b.z);
      const back = clamp(0.35 + (-b.z - b.x * 0.4) / 110);        // taller skyline to the north-west
      const calm = b.x >= -30 && b.x <= 60 && b.z >= -30 && b.z <= 60 ? 0.35 : 1;  // keep the hero's surroundings low
      let h = 5 + 9 * R() + Math.pow(R(), 1.7) * 46 * back * calm;
      if (near < 32) h = Math.min(h, 12);
      if (low) h = Math.min(h, 4.5 + 3 * R());
      bld.push({ x: b.x + ox, z: b.z + oz, w: w * (0.82 + 0.16 * R()), d: d * (0.82 + 0.16 * R()), h, seed: R(), dist: near });
    }
  }
  for (const b of bld) {
    if (BRANCH.some(([x, z]) => Math.abs(b.x - x) < 9 && Math.abs(b.z - z) < 9)) b.h = 0.001;
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0.5, 0);
  const seeds = new Float32Array(bld.length);
  bld.forEach((b, k) => { seeds[k] = Math.floor(b.seed * 997); });
  boxGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const bUniforms = { uLit: { value: 1 }, uDim: { value: 0 } };
  const bMat = new THREE.MeshStandardMaterial({ color: '#232d40', roughness: 0.72, metalness: 0.18 });
  bMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, bUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSeed; varying vec3 vWP; varying vec3 vWN; varying float vSeed;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wpp = modelMatrix * instanceMatrix * vec4(transformed, 1.0); vWP = wpp.xyz; vSeed = aSeed;
        vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uLit, uDim; varying vec3 vWP; varying vec3 vWN; varying float vSeed;
        float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 wn = normalize(vWN);
          float side = 1.0 - step(0.5, abs(wn.y));
          vec2 f = abs(wn.x) > 0.5 ? vec2(vWP.z, vWP.y) : vec2(vWP.x, vWP.y);
          vec2 cell = vec2(1.8, 2.9);
          vec2 uvw = f / cell; vec2 id = floor(uvw); vec2 g = fract(uvw);
          vec2 fw = max(fwidth(uvw), vec2(1e-4));
          vec2 wx = smoothstep(vec2(0.24, 0.3) - fw, vec2(0.24, 0.3) + fw, g) * (1.0 - smoothstep(vec2(0.76, 0.74) - fw, vec2(0.76, 0.74) + fw, g));
          float sharp = wx.x * wx.y;
          float blurK = smoothstep(0.18, 0.5, max(fw.x, fw.y));
          float win = mix(sharp, 0.23, blurK) * step(1.4, vWP.y);
          float sd = floor(vSeed + 0.5);
          float h = hash12(id + vec2(sd * 1.37 + 11.0, sd * 0.71 + 5.0));
          float lit = mix(step(0.63, h), 0.37, blurK) * (1.0 - uDim * step(0.2, fract(h * 13.0)));
          vec3 wc = mix(vec3(1.0, 0.72, 0.44), vec3(0.7, 0.82, 1.0), step(0.86, h)) * 0.85;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.045, 0.07), side * win);
          totalEmissiveRadiance += side * win * lit * wc * uLit * mix(0.3 + 0.4 * fract(h * 7.0), 0.5, blurK) * 0.95;
          float rim = smoothstep(0.93, 1.0, fract(vWP.y / 3.1)) * side * 0.06;
          totalEmissiveRadiance += vec3(0.35, 0.45, 0.7) * rim * uLit;
        }`);
  };
  const buildings = new THREE.InstancedMesh(boxGeo, bMat, bld.length);
  buildings.castShadow = true; buildings.receiveShadow = true;
  buildings.frustumCulled = false;
  scene.add(buildings);
  const setBuildings = (grow) => {
    bld.forEach((b, k) => {
      const g = grow(b);
      m4.makeScale(b.w, Math.max(0.001, b.h * g), b.d).setPosition(b.x, 0, b.z);
      buildings.setMatrixAt(k, m4);
    });
    buildings.instanceMatrix.needsUpdate = true;
  };

  // ---------------------------------------------------------------- park trees
  const treePos = [];
  for (const b of parks) for (let k = 0; k < 16; k++) {
    const x = b.x + (R() - 0.5) * 17, z = b.z + (R() - 0.5) * 17;
    if (Math.abs(x - b.x) < 6.5) continue;      // an open lawn in the middle keeps the view to the hero lot clear
    treePos.push([x, z, 0.65 + R() * 0.45]);
  }
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshStandardMaterial({ color: '#16301f', roughness: 0.9 }), treePos.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 6).translate(0, 0.8, 0), new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.9 }), treePos.length);
  treePos.forEach(([x, z, s2], k) => {
    m4.makeScale(s2, s2 * 1.15, s2).setPosition(x, 0.3 + 2.1 * s2, z); crown.setMatrixAt(k, m4);
    m4.makeScale(s2, s2, s2).setPosition(x, 0.3, z); trunk.setMatrixAt(k, m4);
  });
  crown.castShadow = true; trunk.castShadow = true;
  scene.add(crown, trunk);
  treePos.forEach(([x, z], k) => { if ((x > 4.6 && x < 15 && z > 16.5 && z < 27.5) || (x > -10 && x < -1 && z > 15 && z < 24.5)) { m4.makeScale(1e-4, 1e-4, 1e-4); crown.setMatrixAt(k, m4); trunk.setMatrixAt(k, m4); } });   // room for the shop

  // ---------------------------------------------------------------- street lights and moving cars
  const lampPos = [];
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (R() < 0.8) lampPos.push([i * PITCH + sx * (HALF + 0.6), j * PITCH + sz * (HALF + 0.6)]);
  }
  const lampGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc98a').multiplyScalar(2.2), toneMapped: false });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampPos.length);
  lampPos.forEach(([x, z], k) => { m4.makeTranslation(x, 4.2, z); lamps.setMatrixAt(k, m4); });
  scene.add(lamps);
  const poolTex = radialTexture();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: '#ffb46b', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolMat, lampPos.length);
  lampPos.forEach(([x, z], k) => { m4.makeTranslation(x, 0.33, z); pools.setMatrixAt(k, m4); });
  scene.add(pools);

  const cars = [];
  for (let k = 0; k < 90; k++) {
    const alongX = R() < 0.5, line = Math.floor(R() * (2 * N)) - N + 0.5, dir = R() < 0.5 ? 1 : -1;
    cars.push({ alongX, c: line * PITCH + dir * 1.7, dir, speed: 7 + R() * 7, ph: R() * 2 * EDGE });
  }
  const carGeo = new THREE.BoxGeometry(0.7, 0.3, 1.5); carGeo.translate(0, 0.4, 0);
  const carMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const carMesh = new THREE.InstancedMesh(carGeo, carMat, cars.length);
  cars.forEach((c, k) => carMesh.setColorAt(k, c.dir > 0 ? new THREE.Color('#ff3b30').multiplyScalar(1.3) : new THREE.Color('#fff2d8').multiplyScalar(1.25)));
  scene.add(carMesh);
  const setCars = (t, alpha) => {
    const q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    cars.forEach((c, k) => {
      let u = ((c.ph + c.dir * c.speed * t) % (2 * EDGE) + 2 * EDGE) % (2 * EDGE) - EDGE;
      if (c.alongX) { p.set(u, 0, c.c); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); } else { p.set(c.c, 0, u); q.identity(); }
      s.setScalar(alpha < 0.01 || p.distanceTo(camera.position) < 75 ? 0.001 : 1);   // no cars right under a close-up camera
      m4.compose(p, q, s); carMesh.setMatrixAt(k, m4);
    });
    carMesh.instanceMatrix.needsUpdate = true;
  };

  // ---------------------------------------------------------------- hero parcel, outline
  const outline = new THREE.Group();
  const outlineMat = new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0 });
  for (const [w, d, x, z] of [[20.4, 0.22, 0, 10.1], [20.4, 0.22, 0, -10.1], [0.22, 20.4, 10.1, 0], [0.22, 20.4, -10.1, 0]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), outlineMat); e.position.set(x, 0.36, z); outline.add(e);
  }
  scene.add(outline);

  // ---------------------------------------------------------------- the sign (domain)
  const sign = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#2a3140', roughness: 0.35, metalness: 0.8 });
  const posts = [-3.1, 3.1].map((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.2, 0.34).translate(0, 1.6, 0), metal); p.position.x = x; p.castShadow = true; sign.add(p); return p; });
  const signTex = textTexture(['websiteniz', '.com'], 1024, 256);
  const panelFront = new THREE.MeshStandardMaterial({ color: '#0c1220', emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0, roughness: 0.4, metalness: 0.3 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.9, 0.32), [metal, metal, metal, metal, panelFront, metal]);
  panel.castShadow = true;
  const panelRig = new THREE.Group(); panelRig.add(panel); sign.add(panelRig);
  const signEdge = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.07, 0.36), new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 }));
  panelRig.add(signEdge); signEdge.position.y = -1.02;
  const ghostSign = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.6, 1.9, 0.32)), new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(1.6), transparent: true, opacity: 0, toneMapped: false }));
  ghostSign.position.y = 4.15;
  sign.add(ghostSign);
  sign.position.copy(SIGN_A); sign.rotation.y = 0.18;
  scene.add(sign);

  // ---------------------------------------------------------------- servers (hosting)
  const servers = new THREE.Group(); servers.position.copy(HERO);
  const rackTex = rackTexture();
  const rackBody = new THREE.MeshStandardMaterial({ color: '#141922', roughness: 0.45, metalness: 0.7 });
  const rackFront = new THREE.MeshStandardMaterial({ color: '#ffffff', map: rackTex, roughness: 0.5, metalness: 0.5 });
  const racks = [-3.2, 0, 3.2].map((x) => {
    const g = new THREE.Group(); g.position.x = x;
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5.4, 1.9).translate(0, 2.7, 0), [rackBody, rackBody, rackBody, rackBody, rackFront, rackBody]);
    m.castShadow = true; m.receiveShadow = true; g.add(m); servers.add(g); return g;
  });
  const ledPos = [];
  racks.forEach((r, ri) => { for (let u = 0; u < 10; u++) for (let l = 0; l < 3; l++) ledPos.push({ ri, u, x: r.position.x - 0.9 + l * 0.22, y: 0.55 + u * 0.5, z: 0.97 }); });
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), new THREE.MeshBasicMaterial({ toneMapped: false }), ledPos.length);
  ledPos.forEach((p, k) => { m4.makeTranslation(p.x, p.y, p.z); leds.setMatrixAt(k, m4); });
  servers.add(leds);
  const sliceMat = new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(1.8), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const slice = new THREE.Mesh(new THREE.BoxGeometry(2.62, 1.05, 2.0).translate(0, 0, 0), sliceMat);
  slice.position.set(0, 2.9, 0);
  servers.add(slice);
  const sliceEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.66, 1.08, 2.04)), new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(3), transparent: true, opacity: 0, toneMapped: false }));
  sliceEdges.position.copy(slice.position); servers.add(sliceEdges);
  scene.add(servers);

  // ---------------------------------------------------------------- buildings that rise floor by floor
  const hero = towerGroup({ floors: 8, w: 12, d: 12, fh: 3.4, seed: 3, glassTint: '#3d5f96' });
  hero.group.position.copy(HERO); scene.add(hero.group);
  // doors
  const doorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bcd6ff').multiplyScalar(1.25), transparent: true, opacity: 0, toneMapped: false });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.9).translate(0, 1.45, 0), doorMat);
  door.position.set(HERO.x, 0.36, HERO.z + 6.05); scene.add(door);

  // ---------------------------------------------------------------- gate
  const gate = new THREE.Group();
  const gateMat = new THREE.MeshStandardMaterial({ color: '#1b2333', roughness: 0.4, metalness: 0.6 });
  for (const x of [-5.4, 5.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8).translate(0, 4.5, 0), gateMat); p.position.x = x; gate.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.8, 0.8), gateMat); beam.position.y = 9; gate.add(beam);
  const gateLight = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.12, 0.84), new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.5), toneMapped: false, transparent: true, opacity: 0.25 }));
  gateLight.position.y = 8.55; gate.add(gateLight);
  gate.position.copy(GATE); scene.add(gate);

  // ---------------------------------------------------------------- routes (DNS)
  const route1 = makeRoute([[GATE.x, GATE.z], [-42, 14], [0, 14], [0, HERO.z + 6.4]], 5);
  scene.add(route1.mesh, route1.head);

  // ================================================================ episode 2 objects
  // ---------------------------------------------------------------- the café with public Wi-Fi, on the route's street
  const CAFE = new THREE.Vector3(-51.5, 0, 56);
  const cafe = new THREE.Group(); cafe.position.copy(CAFE);
  const cafeBody = new THREE.Mesh(new THREE.BoxGeometry(8, 4.6, 11).translate(0, 2.3, 0), new THREE.MeshStandardMaterial({ color: '#2b2431', roughness: 0.7 }));
  cafeBody.castShadow = true; cafeBody.receiveShadow = true; cafe.add(cafeBody);
  const cafeWin = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb56b').multiplyScalar(1.5), toneMapped: false }));
  cafeWin.rotation.y = Math.PI / 2; cafeWin.position.set(4.02, 1.65, 0); cafe.add(cafeWin);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 10.6), new THREE.MeshStandardMaterial({ color: '#c24c3f', roughness: 0.6 }));
  awning.position.set(5.0, 3.2, 0); awning.rotation.z = -0.35; awning.castShadow = true; cafe.add(awning);
  const cafeSign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), new THREE.MeshBasicMaterial({ map: labelTexture('KAFE', '#ffe3bd'), transparent: true, toneMapped: false }));
  cafeSign.rotation.y = Math.PI / 2; cafeSign.position.set(4.06, 4.05, 0); cafe.add(cafeSign);
  for (const z of [-3.2, 0, 3.2]) {           // little tables on the pavement
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16).translate(0, 1.0, 0), new THREE.MeshStandardMaterial({ color: '#d9d2c7', roughness: 0.5 }));
    tbl.position.set(6.6, 0.3, z); cafe.add(tbl);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0).translate(0, 0.5, 0), metal); leg.position.set(6.6, 0.3, z); cafe.add(leg);
  }
  scene.add(cafe);
  const wifi = new THREE.Group();
  const wifiParts = [0.8, 1.6, 2.4].map((r) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.17, 8, 40, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#a9ccff').multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0 })); m.rotation.z = Math.PI / 4; wifi.add(m); return m; });
  const wifiDot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#a9ccff').multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0 }));
  wifi.add(wifiDot); wifiParts.push(wifiDot);
  wifi.position.set(CAFE.x + 1.5, 8.6, CAFE.z); scene.add(wifi);

  // ---------------------------------------------------------------- data travelling on the road: postcards, then locked boxes
  const cardTex = postcardTexture(), boxTex = lockboxTexture();
  const cardMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: cardTex, emissive: '#ffffff', emissiveMap: cardTex, emissiveIntensity: 0.45, roughness: 0.6, transparent: true });
  const boxMat = new THREE.MeshStandardMaterial({ color: '#0f2a57', emissive: '#ffffff', emissiveMap: boxTex, emissiveIntensity: 1.0, roughness: 0.35, metalness: 0.5, transparent: true });
  const edgeMat = new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(3), toneMapped: false, transparent: true });
  const cardGeo = new THREE.BoxGeometry(2.8, 1.85, 0.06), boxGeo2 = new THREE.BoxGeometry(1.7, 1.7, 1.7), boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.74, 1.74, 1.74));
  const PK = 11;
  const makePacket = () => {
    const g = new THREE.Group();
    const card = new THREE.Mesh(cardGeo, cardMat); const box = new THREE.Mesh(boxGeo2, boxMat); box.add(new THREE.LineSegments(boxEdges, edgeMat));
    g.add(card, box); scene.add(g); return { g, card, box };
  };
  const packets = [...Array(PK)].map((_, i) => ({ ...makePacket(), ph: i / PK }));
  const grab = makePacket();                   // the one the magnifier picks up

  // ---------------------------------------------------------------- the eavesdropper's magnifier over the café's street
  const MAGP = new THREE.Vector3(-41.5, 7.2, 63);
  const mag = new THREE.Group();
  const magRingMat = new THREE.MeshStandardMaterial({ color: '#d7deea', metalness: 0.9, roughness: 0.25, emissive: '#ff4d45', emissiveIntensity: 0 });
  mag.add(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.2, 12, 40), magRingMat));
  mag.add(new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: '#bcd6ff', transparent: true, opacity: 0.16, depthWrite: false })));
  const magHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.8, 12), new THREE.MeshStandardMaterial({ color: '#1d2432', metalness: 0.6, roughness: 0.4 }));
  magHandle.position.set(1.75, -1.75, 0); magHandle.rotation.z = Math.PI / 4; mag.add(magHandle);
  mag.position.copy(MAGP); mag.scale.setScalar(1.35); scene.add(mag);

  // ---------------------------------------------------------------- the door: a leaf that closes, a padlock, a renewal ring
  const DOORZ = HERO.z + 6.1;
  const doorLeaf = new THREE.Group(); doorLeaf.position.set(HERO.x - 1.3, 0.36, DOORZ + 0.08);
  doorLeaf.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.9, 0.12).translate(1.3, 1.45, 0), new THREE.MeshStandardMaterial({ color: '#1a2946', metalness: 0.6, roughness: 0.3 })));
  scene.add(doorLeaf);
  const lockMetal = new THREE.MeshStandardMaterial({ color: '#dfe6f2', metalness: 0.95, roughness: 0.22, emissive: BLUE, emissiveIntensity: 0 });
  const lock = new THREE.Group();
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 0.55), lockMetal); lock.add(lockBody);
  const shackle = new THREE.Group();
  shackle.add(new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.15, 12, 28, Math.PI), lockMetal));
  for (const x of [-0.56, 0.56]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 12), lockMetal); l.position.set(x, -0.2, 0); shackle.add(l); }
  shackle.position.y = 0.7; lock.add(shackle);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshBasicMaterial({ color: '#0b1222' })); hole.position.set(0, -0.08, 0.28); lock.add(hole);
  const lockRim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.74, 1.44, 0.58)), new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 }));
  lock.add(lockRim);
  const LOCKP = new THREE.Vector3(HERO.x + 0.9, 1.75, DOORZ + 0.55);
  lock.position.copy(LOCKP); lock.traverse((o) => { o.castShadow = true; });
  scene.add(lock);
  const ghostLock = new THREE.Group();
  const ghostMat = new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0 });
  ghostLock.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.4, 0.55)), ghostMat));
  const ghostArc = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(0.56, 0.02, 3, 20, Math.PI), 1), ghostMat); ghostArc.position.y = 0.95; ghostLock.add(ghostArc);
  ghostLock.position.copy(LOCKP); scene.add(ghostLock);
  const ringMat = new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0 });
  const renew = new THREE.Group();
  renew.add(new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 8, 64, Math.PI * 1.65), ringMat));
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12), ringMat); arrowHead.position.set(1.9, 0, 0); arrowHead.rotation.z = Math.PI; renew.add(arrowHead);
  renew.position.copy(LOCKP).add(new THREE.Vector3(0, 0.2, 0.1)); scene.add(renew);

  // ---------------------------------------------------------------- visitors who come to the door (and turn back without a lock)
  const personMat = new THREE.MeshStandardMaterial({ color: '#e9edf5', emissive: '#ffd9a8', emissiveIntensity: 0.55, roughness: 0.5, transparent: true });
  const bodyGeo = new THREE.CapsuleGeometry(0.42, 0.9, 6, 12).translate(0, 0.87, 0), headGeo = new THREE.SphereGeometry(0.34, 16, 12).translate(0, 2.05, 0);
  const visitors = [...Array(6)].map(() => {
    const m = new THREE.Group(); const mat = personMat.clone();
    const b = new THREE.Mesh(bodyGeo, mat), h = new THREE.Mesh(headGeo, mat); b.castShadow = true; m.add(b, h); m.userData.mat = mat;
    scene.add(m); return m;
  });

  // ================================================================ episode 3 objects: the mailbox, letters, seals, spam
  // a classic post mailbox in front of the building, right of the door
  const MBOX = new THREE.Vector3(HERO.x + 3.9, 0.36, DOORZ + 2.2);
  const makeMailbox = (color, label, scale = 1) => {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.35, emissive: color, emissiveIntensity: 0.0, transparent: true });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.7, 10).translate(0, 0.85, 0), metal);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.9).translate(0, 2.15, 0), bodyMat);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.9, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 2.6, 0), bodyMat);
    roof.rotation.y = 0;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: '#05080e' })); slot.position.set(0, 2.45, 0.97);
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTexture(label), transparent: true, opacity: 1 });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.42), plateMat); plate.position.set(0, 1.98, 0.965);
    const flag = new THREE.Group(); flag.position.set(0.74, 2.2, 0.4);
    flag.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.07).translate(0, 0.45, 0), metal));
    const flagMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a4f').multiplyScalar(1.4), toneMapped: false });
    flag.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.42).translate(0, 0.74, -0.21), flagMat));
    g.add(post, box, roof, slot, plate, flag);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.scale.setScalar(scale);
    return { g, bodyMat, plateMat, flag, flagMat };
  };
  const mailbox = makeMailbox('#1c63e0', 'bilgi@websiteniz.com');
  mailbox.g.position.copy(MBOX); scene.add(mailbox.g);
  const ghostBoxMat = new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0 });
  const ghostBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4, 1.6, 1.9).translate(0, 2.3, 0)), ghostBoxMat);
  ghostBox.position.copy(MBOX); scene.add(ghostBox);
  // three more boxes for departments
  const depts = [['satış', 1.9], ['muhasebe', 3.75], ['destek', 5.6]].map(([n, dx]) => { const m = makeMailbox('#2f7bff', n, 0.78); m.g.position.copy(MBOX).add(new THREE.Vector3(dx, 0, 0.2)); scene.add(m.g); return m; });
  // free, anyone-can-open mailboxes popping up in the park, one of them a fraudster's
  const FREE = [[-6.5, 21], [-3, 24.5], [0.5, 21.5], [4, 25], [6.8, 21], [-5, 28.5], [-1.2, 29], [2.6, 29.5], [6, 30], [-7, 33], [1, 33.5], [5, 34]];
  const freeBoxes = FREE.map(([x, z], k) => { const m = makeMailbox(k === 4 ? '#c23a33' : '#6b7383', k === 4 ? 'teklif@•••' : '@ücretsiz', 0.7); m.g.position.set(x, 0.3, z); scene.add(m.g); return m; });
  // the spam bin at the kerb
  const SPAMP = new THREE.Vector3(HERO.x + 8.2, 0.36, DOORZ + 4.6);
  const spamBin = new THREE.Group();
  const binMat = new THREE.MeshStandardMaterial({ color: '#3a4152', roughness: 0.6, metalness: 0.4 });
  spamBin.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.85, 1.9, 20, 1, true).translate(0, 0.95, 0), binMat));
  spamBin.add(new THREE.Mesh(new THREE.CircleGeometry(0.85, 20).rotateX(-Math.PI / 2).translate(0, 0.05, 0), binMat));
  const binLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: labelTexture('SPAM', '#ff8a80'), transparent: true, toneMapped: false }));
  binLabel.position.set(0, 2.45, 0); spamBin.add(binLabel);
  spamBin.position.copy(SPAMP); spamBin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(spamBin);
  // letters: sealed (from you) and unsealed (fake / unverified)
  const envTexS = envelopeTexture(true), envTexU = envelopeTexture(false);
  const envGeo = new THREE.BoxGeometry(1.7, 1.1, 0.05);
  const envMatS = new THREE.MeshStandardMaterial({ color: '#ffffff', map: envTexS, emissive: '#ffffff', emissiveMap: envTexS, emissiveIntensity: 0.16, roughness: 0.6, transparent: true });
  const envMatU = new THREE.MeshStandardMaterial({ color: '#ffffff', map: envTexU, emissive: '#ffffff', emissiveMap: envTexU, emissiveIntensity: 0.14, roughness: 0.6, transparent: true });
  const LET = 9;
  const letters = [...Array(LET)].map((_, i) => { const m = new THREE.Mesh(envGeo, envMatS); m.castShadow = true; scene.add(m); return { m, ph: i / LET }; });
  const fakeL = new THREE.Mesh(envGeo, envMatU); scene.add(fakeL);
  const outL = new THREE.Mesh(envGeo, envMatU); scene.add(outL);
  // the street lamps right in front of the hero lot would glare into the close-ups
  lampPos.forEach(([x, z], k) => { if (Math.abs(x - HERO.x) < 12 && z > 8 && z < 19) { m4.makeScale(1e-4, 1e-4, 1e-4); lamps.setMatrixAt(k, m4); pools.setMatrixAt(k, m4); } });
  lamps.instanceMatrix.needsUpdate = true; pools.instanceMatrix.needsUpdate = true;

  // ================================================================ episode 4 objects: the queue at the door, the shop next door,
  // a heavy photo on the road, a crowded shared server, a wide door, branches across the city and a speed gauge
  // ---------------------------------------------------------------- people queueing along the road to the door
  const QN = 16, QGAP = 1.3;
  const qPerson = (k, mul = 1) => {
    const m = new THREE.Group(); const mat = personMat.clone();
    const b = new THREE.Mesh(bodyGeo, mat), h = new THREE.Mesh(headGeo, mat); b.castShadow = true; m.add(b, h);
    m.scale.setScalar(0.92 * mul); scene.add(m);
    return { m, mat, emi: mul > 1 ? 6 : 1, jit: (hash(k * 3.7 + 0.3) - 0.5) * 0.7, ph: hash(k * 1.9 + 0.7) * 6.28 };
  };
  const queue = [...Array(QN)].map((_, k) => qPerson(k));
  const stream = [...Array(10)].map((_, k) => qPerson(k + 40));      // once the door is wide: people walk straight in
  // ---------------------------------------------------------------- the shop next door
  const shop = new THREE.Group(); shop.position.copy(SHOP);                     // its front faces the square
  const shopBody = new THREE.Mesh(new THREE.BoxGeometry(6, 4.2, 3.6).translate(0, 2.1, 0), new THREE.MeshStandardMaterial({ color: '#2c2a38', roughness: 0.7 }));
  shopBody.castShadow = true; shopBody.receiveShadow = true; shop.add(shopBody);
  const shopWinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc58a').multiplyScalar(1.1), toneMapped: false });
  const shopWin = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.1), shopWinMat); shopWin.position.set(0, 1.45, 1.82); shop.add(shopWin);
  const shopAwn = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: '#2f9d6a', roughness: 0.6 }));
  shopAwn.position.set(0, 3.0, 2.3); shopAwn.rotation.x = 0.28; shopAwn.castShadow = true; shop.add(shopAwn);
  const shopSign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: labelTexture('DÜKKAN', '#ffe3bd'), transparent: true, toneMapped: false }));
  shopSign.position.set(0, 3.75, 1.86); shop.add(shopSign);
  scene.add(shop);
  // ---------------------------------------------------------------- a heavy photo crawling down the road, the page's data stuck behind it
  const crateTexBig = crateTexture('IMG_4021.jpg', '6,4 MB', '#ff6a3d'), crateTexSmall = crateTexture('urun.webp', '180 KB', '#37d67a');
  const crateMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: crateTexBig, emissive: '#ffffff', emissiveMap: crateTexBig, emissiveIntensity: 0.35, roughness: 0.55, metalness: 0.1 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), crateMat);
  crate.castShadow = true; scene.add(crate);
  const crateEdgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#ff6a3d').multiplyScalar(2.2), toneMapped: false, transparent: true });
  const crateEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02).translate(0, 0.5, 0)), crateEdgeMat);
  crate.add(crateEdge);
  const parcels = [...Array(8)].map(() => { const m = new THREE.Mesh(boxGeo2, boxMat); m.add(new THREE.LineSegments(boxEdges, edgeMat)); m.castShadow = true; scene.add(m); return m; });
  // ---------------------------------------------------------------- a cheap shared server: hundreds of sites on the same building
  const SITES = ['kafe.com', 'oto.net', 'butik.co', 'emlak.biz', 'spor.net', 'kitap.com', 'pizza.co', 'foto.net', 'yoga.com', 'dis.biz', 'cicek.co', 'tur.net'];
  const siteTex = SITES.map((s) => plateTexture2(s));
  const hostPlates = [];
  for (let f = 1; f < 8; f++) {
    for (const x of [-3.9, 0]) hostPlates.push({ p: new THREE.Vector3(HERO.x + x, f * 3.4 + 1.7, HERO.z + 6.32), ry: 0 });
    for (const z of [-3, 2.4]) hostPlates.push({ p: new THREE.Vector3(HERO.x - 6.32, f * 3.4 + 1.7, HERO.z + z), ry: -Math.PI / 2 });
  }
  hostPlates.forEach((h, k) => {
    h.mat = new THREE.MeshBasicMaterial({ map: siteTex[(k * 5) % SITES.length], transparent: true, opacity: 0 });
    h.m = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.82), h.mat);
    h.m.position.copy(h.p); h.m.rotation.y = h.ry; scene.add(h.m);
    h.ord = hash(k * 2.3 + 0.5);
  });
  // ---------------------------------------------------------------- the wide door: a glowing frame that opens up the entrance
  const portalMat = new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0 });
  const portal = new THREE.Group(); portal.position.set(HERO.x, 0.36, DOORZ + 0.2);
  const pPostL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22).translate(0, 1.7, 0), portalMat);
  const pPostR = pPostL.clone(), pBeam = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.22), portalMat);
  portal.add(pPostL, pPostR, pBeam); scene.add(portal);
  // ---------------------------------------------------------------- branches: copies of the site in other parts of the city (CDN)
  const branches = BRANCH.map(([x, z], k) => {
    const tw = towerGroup({ floors: 5, w: 8, d: 8, fh: 3.1, seed: 11 + k, glassTint: '#3d5f96' });
    tw.group.position.set(x, 0, z); scene.add(tw.group);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    tag.position.set(x, 5 * 3.1 + 3.6, z); scene.add(tag);
    const ringB = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0, depthWrite: false }));
    ringB.position.set(x, 0.45, z); scene.add(ringB);
    return { tw, tag, ringB, x, z };
  });
  // far-away visitors: one per branch, each with a ground beacon
  const farV = FARV.map(([x, z], k) => {
    const p = qPerson(k + 80, 2.4); p.m.position.set(x, 0, z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.3, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a8').multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0, depthWrite: false }));
    ring.position.set(x, 0.42, z); scene.add(ring);
    return { ...p, ring, x, z };
  });
  const longRoute = makeRoute([[FARV[0][0], FARV[0][1]], [FARV[0][0], 14], [0, 14], [0, HERO.z + 6.4]], 5);
  longRoute.mesh.material.uniforms.uColor.value = new THREE.Color('#ff7a3d');
  longRoute.head.material.color.set(new THREE.Color('#ffd0b0').multiplyScalar(3));
  scene.add(longRoute.mesh, longRoute.head);
  const shortRoutes = FARV.map(([x, z], k) => { const r = makeRoute(SHORT[k], 3); scene.add(r.mesh, r.head); return r; });
  // ---------------------------------------------------------------- the speed gauge above the door
  const gauge = new THREE.Group(); gauge.position.set(HERO.x, 4.75, DOORZ + 0.42);
  gauge.add(new THREE.Mesh(new THREE.CircleGeometry(2.15, 48, 0, Math.PI).translate(0, -0.05, -0.02), new THREE.MeshStandardMaterial({ color: '#0b1222', roughness: 0.5, metalness: 0.4 })));
  gauge.add(new THREE.Mesh(new THREE.PlaneGeometry(4.3, 0.5).translate(0, -0.28, -0.02), new THREE.MeshStandardMaterial({ color: '#0b1222', roughness: 0.5, metalness: 0.4 })));
  const gSegs = [[0, 49, '#ff4d45'], [50, 89, '#ffb020'], [90, 100, '#37d67a']].map(([s0, s1, c]) => {
    const a0 = Math.PI * (1 - (s1 + 0.6) / 100), a1 = Math.PI * (1 - (s0 - 0.6) / 100);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), toneMapped: false, transparent: true });
    gauge.add(new THREE.Mesh(new THREE.RingGeometry(1.45, 1.9, 40, 1, Math.max(0, a0), Math.min(Math.PI, a1) - Math.max(0, a0)), mat)); return mat;
  });
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.55, 0.06).translate(0, 0.72, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.6), toneMapped: false }));
  gauge.add(needle);
  gauge.add(new THREE.Mesh(new THREE.CircleGeometry(0.26, 24).translate(0, 0, 0.07), new THREE.MeshBasicMaterial({ color: '#dfe6f2' })));
  scene.add(gauge);

  // ================================================================ episode 5 objects: a safe with the spare key, a second safe on a cloud,
  // rubble when the building falls, the beams that copy and restore it, attackers' shadows, and the clock of daily backups
  // ---------------------------------------------------------------- safes
  const makeSafe = (scale = 1) => {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: '#2b3446', roughness: 0.35, metalness: 0.85, emissive: '#1c73fd', emissiveIntensity: 0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.0).translate(0, 1.3, 0), steel);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5b9cff').multiplyScalar(0.85), toneMapped: false, transparent: true, opacity: 0 }));
    inner.position.set(0, 1.3, 1.01);
    const doorPivot = new THREE.Group(); doorPivot.position.set(-1.1, 0, 1.02);         // hinged on the left edge
    const knob = new THREE.MeshStandardMaterial({ color: '#c9d3e6', metalness: 0.9, roughness: 0.25 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.14).translate(1.1, 1.3, 0.07), steel);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 32).rotateX(Math.PI / 2), knob); dial.position.set(1.25, 1.5, 0.2);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), knob); handle.position.set(1.85, 1.05, 0.2);
    doorPivot.add(door, dial, handle);
    const rimMat = new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0.9 });
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.44, 2.64, 2.04).translate(0, 1.3, 0)), rimMat);
    g.add(body, inner, doorPivot, rim);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.scale.setScalar(scale);
    return { g, steel, inner, doorPivot, dial, rimMat, scale };
  };
  const safe1 = makeSafe(1.2); safe1.g.position.copy(SAFE1); scene.add(safe1.g);
  const safe2 = makeSafe(0.95); scene.add(safe2.g);
  // a ghost of the safe inside the building's lobby ("don't keep it in the same building")
  const ghostSafeMat = new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0 });
  const ghostSafe = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 2.6, 2.0).translate(0, 1.3, 0)), ghostSafeMat);
  ghostSafe.position.set(HERO.x + 3.4, 0.36, HERO.z + 3.2); scene.add(ghostSafe);
  // the cloud the second safe sits on
  const cloud = new THREE.Group(); cloud.position.copy(CLOUD);
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#dfe8f7', emissive: '#9cc2ff', emissiveIntensity: 0.22, roughness: 1, transparent: true, opacity: 0 });
  for (const [x, y, z, r] of [[0, 0, 0, 2.6], [-2.6, -0.5, 0.4, 2.0], [2.7, -0.4, -0.2, 2.1], [-1.2, 1.1, -0.6, 1.9], [1.4, 1.0, 0.5, 1.8], [-4.4, -0.9, 0, 1.3], [4.4, -0.9, 0.3, 1.4], [0, -0.9, 1.6, 1.8]]) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), cloudMat); m.position.set(x, y, z); m.scale.y = 0.72; cloud.add(m);
  }
  scene.add(cloud);
  // ---------------------------------------------------------------- the spare key (gold) and an untested key (grey)
  const makeKey = (color, emissive) => {
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.25, emissive, emissiveIntensity: 0.6, transparent: true });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 12, 32), mat));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 12).rotateZ(Math.PI / 2).translate(1.17, 0, 0), mat));
    for (const [x, h] of [[1.55, 0.32], [1.3, 0.22], [1.8, 0.26]]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.1).translate(x, -h / 2 - 0.05, 0), mat));
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g); return { g, mat };
  };
  const goldKey = makeKey('#ffcf5a', '#ffb020'), greyKey = makeKey('#8b93a3', '#3a4254');
  // the backup's contents: a small wireframe copy of the building over the open safe
  const holoMat = new THREE.LineBasicMaterial({ color: BLUE.clone().multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0 });
  const holo = new THREE.Group();
  holo.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 2.8, 1.3).translate(0, 1.4, 0)), holoMat));
  for (let f = 1; f < 8; f++) { const fl = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 0.001, 1.3)), holoMat); fl.position.y = f * 0.35; holo.add(fl); }
  scene.add(holo);
  // ---------------------------------------------------------------- the clock of daily backups over the safe
  const clockMat = new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0 });
  const clock = new THREE.Group();
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.85, 48), new THREE.MeshBasicMaterial({ color: '#0b1222', transparent: true, opacity: 0 }));
  clock.add(clockFace, new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.07, 8, 48), clockMat));
  for (let k = 0; k < 12; k++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.05, k % 3 ? 0.1 : 0.2, 0.02), clockMat); const a = k / 12 * Math.PI * 2; tk.position.set(Math.sin(a) * 0.68, Math.cos(a) * 0.68, 0.02); tk.rotation.z = -a; clock.add(tk); }
  const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.03).translate(0, 0.27, 0.04), clockMat); clock.add(clockHand);
  scene.add(clock);
  // ---------------------------------------------------------------- rubble at the foot of the building
  const RUB = 70, rubR = rng(55);
  const rubMat = new THREE.MeshStandardMaterial({ color: '#4a5263', roughness: 0.8, metalness: 0.2, emissive: '#ff6a3d', emissiveIntensity: 0 });
  const rubble = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rubMat, RUB);
  const rubP = [...Array(RUB)].map(() => ({ x: HERO.x + (rubR() - 0.5) * 14, z: HERO.z + (rubR() - 0.5) * 13, w: 0.6 + rubR() * 2.0, h: 0.35 + rubR() * 1.3, d: 0.6 + rubR() * 1.8, ry: rubR() * 3, rx: (rubR() - 0.5) * 0.6, del: rubR() }));
  rubble.castShadow = true; rubble.receiveShadow = true; scene.add(rubble);
  // ---------------------------------------------------------------- beams: restore (safe → building), copy (safe → cloud), daily (building → safe)
  const makeArc = (a, b, h, color = BLUE) => {
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, h, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 80, 0.13, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 }));
    scene.add(dot);
    const total = geo.index.count;
    const set = (prog, alpha, pulse = -1) => {
      mesh.visible = alpha > 0.002 && prog > 0.002; mat.opacity = alpha;
      geo.setDrawRange(0, Math.floor(clamp(prog) * 80) * 8 * 6);
      const u = pulse >= 0 ? pulse : prog;
      dot.visible = alpha > 0.02 && ((pulse >= 0 && pulse <= 1) || (prog > 0.01 && prog < 0.99));
      dot.material.opacity = alpha; dot.position.copy(curve.getPoint(clamp(u)));
    };
    return { set, curve, mesh };
  };
  const SAFE_TOP = SAFE1.clone().add(new THREE.Vector3(0, 3.2, 0));
  const beamRestore = makeArc(SAFE_TOP, new THREE.Vector3(HERO.x, 2.4, HERO.z + 5.6), 7);
  const beamCloud = makeArc(SAFE_TOP, CLOUD.clone().add(new THREE.Vector3(0, -1.2, 0)), 4);
  const beamDaily = makeArc(new THREE.Vector3(HERO.x - 2.5, 6, HERO.z + 6), SAFE_TOP, 5);
  // ---------------------------------------------------------------- attackers: dark figures
  const attackers = [...Array(4)].map((_, k) => qPerson(k + 120));
  // ---------------------------------------------------------------- a spark burst at the failing servers
  const SPK = 40;
  const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb36b').multiplyScalar(3), toneMapped: false, transparent: true });
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), sparkMat, SPK);
  const sparkV = [...Array(SPK)].map((_, k) => new THREE.Vector3((hash(k * 1.3) - 0.5) * 6, 2 + hash(k * 2.1) * 5, (hash(k * 3.7) - 0.2) * 5));
  scene.add(sparks);
  // ---------------------------------------------------------------- the glow of a fire in the lobby ("bina yanarsa")
  const fireMat = new THREE.MeshBasicMaterial({ map: radialTexture(), color: new THREE.Color('#ff7a2e').multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const fires = [[0, 4.5, 6.4, 16, 12], [-3.5, 9, 6.3, 10, 9], [3.2, 12, 6.3, 9, 8]].map(([x, y, z, w, h]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fireMat); m.position.set(HERO.x + x, y, HERO.z + z); scene.add(m); return m; });

  // ---------------------------------------------------------------- post
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.8, 0.5, 0.86);
  if (!Q.has('nobloom')) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  setBuildings(() => 1);

  // ================================================================ per-frame state (episode 5)
  const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
  const tmpV = new THREE.Vector3();
  const groundY = (x, z) => (Math.abs(x - Math.round(x / PITCH) * PITCH) <= HALF && Math.abs(z - Math.round(z / PITCH) * PITCH) <= HALF ? 0.32 : 0.02);
  const QZ0 = DOORZ + 1.7;
  const qPos = (s, side = 0) => { const x = HERO.x + side, z = QZ0 + s; return new THREE.Vector3(x, groundY(x, z), z); };
  const WARM = new THREE.Color('#ffd9a8'), PCOL = new THREE.Color('#b9c6dc'), DARK = new THREE.Color('#0d1016'), RED = new THREE.Color('#ff3b30');
  function setPerson(P, pos, a, { glow = 0, walk = 0, t = 0, scale = 1, dark = 0 } = {}) {
    P.m.visible = a > 0.01;
    if (!P.m.visible) return;
    P.m.position.copy(pos);
    P.m.position.y += walk * Math.abs(Math.sin(t * 9 + P.ph)) * 0.12;
    P.m.rotation.z = Math.sin(t * 1.3 + P.ph) * 0.03 + walk * Math.sin(t * 9 + P.ph) * 0.06;
    P.m.scale.setScalar(0.92 * scale);
    P.mat.opacity = a;
    P.mat.color.copy(PCOL).lerp(DARK, dark);
    P.mat.emissive.copy(WARM).lerp(RED, dark);
    P.mat.emissiveIntensity = (0.1 + 0.5 * glow) * P.emi * (1 - dark) + dark * (0.07 + 0.04 * Math.sin(t * 6 + P.ph));
  }
  // when the building falls, and when the backup brings it back
  const FALL0 = T.cSil + 0.1, FALL1 = FALL0 + 1.5;
  const REST0 = T.kGeri + 0.25, REST1 = REST0 + 2.4;
  const NEWLOCK = T.uYedek + 0.85;
  const levels = hero.group.children.slice(0, 8), heroRoof = hero.group.children[8], heroCrown = hero.group.children[9];
  const LVL_R = levels.map((_, f) => ({ dx: (hash(f * 3.1 + 1) - 0.5) * 7, dz: (hash(f * 5.3 + 2) - 0.3) * 6, rz: (hash(f * 7.7 + 3) - 0.5) * 1.1, rx: (hash(f * 2.9 + 4) - 0.5) * 0.7 }));
  const WHITE = new THREE.Color('#ffffff'), REDG = new THREE.Color('#ff4d45'), ORANGE = new THREE.Color('#ff8a3d'), GREEN = new THREE.Color('#37d67a');
  const LOCKW = new THREE.Vector3(HERO.x - 2.9 - 0.75, 1.75, DOORZ + 0.55);            // the lock beside last episode's wide door
  const HOLE = LOCKW.clone().add(new THREE.Vector3(0, -0.08, 0.3));
  const score = (t) => 94 * (1 - smooth(prog(t, T.bCok - 0.2, FALL0))) + 94 * smooth(prog(t, REST1 - 0.3, REST1 + 0.7));
  const up = (t, a, b) => (t < a ? 0 : t > b ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * (t - a) / (b - a)));
  // the key's pose when it sits in a keyhole (shaft pointing into the door), rolled by `roll`
  const keyInLock = (K, depth, roll, wob = 0) => {
    K.g.rotation.order = 'YXZ'; K.g.rotation.set(roll, Math.PI / 2 + wob, 0);
    K.g.position.copy(HOLE).add(new THREE.Vector3(0, 0, 1.95 * 0.9 + 1.2 * (1 - depth)));
    K.g.scale.setScalar(0.9);
  };

  function update(t) {
    const look = camera.position.length();
    scene.fog.density = Math.min(0.0052, 0.9 / look);
    skyU.uDay.value = 0; sky.position.copy(camera.position);
    renderer.toneMappingExposure = 1.05;
    gridMat.uniforms.uWave.value = t < T.title - 0.3 ? 400 : lerp(0, 400, outCubic(prog(t, T.title - 0.3, T.title + 3)));
    gridMat.uniforms.uBase.value = 0.16;
    gridMat.uniforms.uFlash.value = 0.45 * pk(t, T.bYol + 0.3, 0.35) + 0.4 * pk(t, REST1 - 0.2, 0.4);
    gridMat.uniforms.uRing.value = -100;
    setCars(t, 1);
    outlineMat.opacity = 0.75 + 0.25 * pk(t, T.bAdres + 0.2, 0.4);

    // ---- the city as it is: sign, road, mailboxes, the shop next door, branches
    ghostSign.material.opacity = 0;
    posts.forEach((p) => { p.scale.y = 1; });
    panelRig.position.y = 4.15; panelRig.visible = true; panel.scale.setScalar(1);
    panelFront.emissiveIntensity = 0.95 + 1.3 * pk(t, T.bAdres + 0.25, 0.3);
    signEdge.material.opacity = 1;
    sign.position.copy(SIGN_A); sign.rotation.y = 0.18; sign.visible = true;
    route1.set(1, 0.5 + 0.35 * pk(t, T.bYol + 0.3, 0.35), t, -1);
    gateLight.material.opacity = 0.9;
    wifi.visible = false; mag.visible = false; grab.g.visible = false;
    packets.forEach((p) => { p.g.visible = false; });
    visitors.forEach((v) => { v.visible = false; });
    ghostBoxMat.opacity = 0; ghostBox.visible = false;
    mailbox.g.visible = true; mailbox.g.position.copy(MBOX); mailbox.g.scale.setScalar(1);
    mailbox.bodyMat.emissiveIntensity = 0.12 + 0.6 * pk(t, T.bPosta + 0.25, 0.3);
    mailbox.plateMat.opacity = 1; mailbox.flag.rotation.x = 0;
    depts.forEach((m) => { m.g.visible = true; m.g.scale.setScalar(0.78); m.bodyMat.emissiveIntensity = 0.1; m.plateMat.opacity = 1; m.flag.rotation.x = 0; });
    freeBoxes.forEach((m) => { m.g.visible = false; });
    letters.forEach((L) => { L.m.visible = false; });
    fakeL.visible = false; outL.visible = false; spamBin.visible = false;
    queue.forEach((P) => { P.m.visible = false; });
    crate.visible = false; parcels.forEach((m) => { m.visible = false; });
    hostPlates.forEach((h) => { h.m.visible = false; });
    farV.forEach((V) => { V.m.visible = false; V.ring.material.opacity = 0; });
    longRoute.set(0, 0, t, -1); shortRoutes.forEach((r) => r.set(0, 0, t, -1));
    branches.forEach((B) => { B.tw.update(t, -10, 1.5, 1.3); B.tag.material.opacity = 1; B.ringB.material.opacity = 0; });

    // ---- the building: shakes, breaks, falls; rises again from the backup
    const fireK = win(t, T.oYan - 0.15, T.oBaska + 0.1, 0.2, 0.45);
    const redK = win(t, T.bCok - 0.1, REST0 + 0.4, 0.3, 0.6);
    const heroLights = 1 + 0.9 * pk(t, T.bBina + 0.25, 0.3) + 0.8 * pk(t, REST1 + 0.1, 0.5);
    if (t < REST0) hero.update(t, -10, 1.5, heroLights); else hero.update(t, REST0, REST1 - REST0, heroLights);
    const shake = (0.14 * win(t, T.bCok - 0.1, T.bEnd + 0.5, 0.1, 0.3) + 0.06 * win(t, T.cSunucu, FALL0, 0.2, 0.05) + 0.1 * fireK) * Math.sin(t * 47);
    hero.group.position.set(HERO.x + shake, 0, HERO.z);
    levels.forEach((lvl, f) => {
      lvl.position.x = 0; lvl.position.z = 0; lvl.rotation.set(0, 0, 0);
      const glass = lvl.children[1].material;
      if (t < REST0) {
        if (f === 5) lvl.position.x = 1.6 * outBack(prog(t, T.cGuncel + 0.1, T.cGuncel + 0.5), 2);        // a bad update knocks a floor sideways
        if (f === 3) { const d = smooth(prog(t, T.cDosya + 0.15, T.cDosya + 0.5)); lvl.scale.multiplyScalar(1 - 0.999 * d); lvl.visible = d < 0.999; }   // a deleted file
        const pf = prog(t, FALL0 + (7 - f) * 0.09, FALL0 + (7 - f) * 0.09 + 0.8);
        if (pf > 0) {
          const k = pf * pf;
          lvl.position.y = lerp(f * 3.4, 0.3, k);
          lvl.position.x += LVL_R[f].dx * k; lvl.position.z = LVL_R[f].dz * k;
          lvl.rotation.set(LVL_R[f].rx * k, 0, LVL_R[f].rz * k);
          const sh = 1 - smooth(prog(pf, 0.7, 1));
          lvl.scale.multiplyScalar(Math.max(0.001, sh)); lvl.visible = lvl.visible && sh > 0.002;
        }
      }
      glass.emissive.copy(WHITE).lerp(REDG, redK * (0.6 + 0.4 * Math.sin(t * 13 + f))).lerp(ORANGE, fireK);
      glass.emissiveIntensity = glass.emissiveIntensity * (1 + fireK * (1.6 + 0.8 * Math.sin(t * 23 + f * 1.7))) + fireK * (f < 4 ? 1.2 : 0.5);
    });
    if (t >= FALL0 && t < REST0) { heroRoof.visible = t < FALL0 + 0.15; heroCrown.material.opacity = 0; }
    fireMat.opacity = fireK * (0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7.3));
    fires.forEach((m, k) => { m.visible = fireK > 0.002; m.scale.setScalar(1 + 0.08 * Math.sin(t * (9 + k * 3) + k)); });
    // rubble
    const rubA = smooth(prog(t, FALL0 + 0.3, FALL0 + 1.4)) * (1 - smooth(prog(t, REST0 + 0.3, REST0 + 1.6)));
    rubble.visible = rubA > 0.002;
    if (rubble.visible) {
      rubP.forEach((r, i) => {
        const s = clamp(rubA * 1.6 - r.del * 0.6);
        m4.compose(tmpV.set(r.x, 0.3 + r.h * s * 0.5, r.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r.rx, r.ry, 0)), new THREE.Vector3(r.w * s + 1e-4, r.h * s + 1e-4, r.d * s + 1e-4));
        rubble.setMatrixAt(i, m4);
      });
      rubble.instanceMatrix.needsUpdate = true;
      rubMat.emissiveIntensity = 0.1 * (0.6 + 0.4 * Math.sin(t * 4)) * rubA;
    }
    // servers: red and sparking when they fail, dark while the building is down
    racks.forEach((r, k) => { r.position.y = 0; r.visible = true; r.rotation.z = k === 2 ? 0.14 * smooth(prog(t, T.cSunucu + 0.1, T.cSunucu + 0.5)) * (t < REST0 ? 1 : 1 - smooth(prog(t, REST0, REST1))) : 0; });
    leds.visible = true;
    const broken = win(t, T.cSunucu - 0.05, REST1, 0.1, 0.4);
    ledPos.forEach((p, k) => {
      const h = hash(k * 7.3), rate = (1.5 + 6 * hash(k * 3.1)) * (1 + 3 * broken);
      const on = Math.sin(t * rate + h * 40) > -0.2 ? 1 : 0.15;
      const base = h > 0.7 ? new THREE.Color('#58ff9c').multiplyScalar(1.8) : new THREE.Color('#3f86ff').multiplyScalar(1.6);
      leds.setColorAt(k, base.lerp(new THREE.Color('#ff4d45').multiplyScalar(2), broken).multiplyScalar(on * (t > FALL1 && t < REST0 ? 0.15 : 1)));
    });
    leds.instanceColor.needsUpdate = true;
    sliceMat.opacity = 0; sliceEdges.material.opacity = 0;
    const spk = Math.max(prog(t, T.cSunucu - 0.05, T.cSunucu + 1.0) * (t < T.cSunucu + 1.0 ? 1 : 0), 0);
    sparks.visible = spk > 0 && spk < 1;
    if (sparks.visible) {
      sparkV.forEach((v, k) => { m4.makeTranslation(HERO.x + v.x * spk, 2.5 + v.y * spk - 9 * spk * spk, HERO.z + 2 + v.z * spk); sparks.setMatrixAt(k, m4); });
      sparks.instanceMatrix.needsUpdate = true; sparkMat.opacity = 1 - spk;
    }

    // ---- the door: last episode's wide frame; gone while the building is down
    const down = t > FALL0 + 0.5 && t < REST1 - 0.3;
    portalMat.opacity = down ? 0 : 1; portal.visible = !down;
    pPostL.position.x = -2.9; pPostR.position.x = 2.9; pBeam.scale.x = 6.02; pBeam.position.y = 3.4;
    door.scale.x = 5.8 / 2.6; door.visible = !down;
    doorMat.color.set('#9cc2ff').multiplyScalar(1.25); doorMat.opacity = 0.9;
    doorLeaf.scale.x = 0.001;
    heroGlow.color.copy(new THREE.Color('#9cc2ff').lerp(ORANGE, fireK)); heroGlow.intensity = 3.5 * (down ? 0.2 : 1) + 6 * fireK; heroGlow.position.set(HERO.x + 2, 3, DOORZ + 3);
    // the lock: rusts when updates are skipped, replaced by a new one after the backup
    lock.visible = !down; lock.rotation.z = 0; lock.position.copy(LOCKW);
    shackle.position.y = 0.7;
    const rust = smooth(prog(t, T.uEski - 0.2, T.uEski + 0.5)) * (t < NEWLOCK ? 1 : 0);
    const swap = prog(t, NEWLOCK - 0.25, NEWLOCK + 0.45);
    lock.scale.setScalar(1 - 0.45 * Math.sin(Math.PI * swap) + 0.25 * pk(t, NEWLOCK + 0.5, 0.2));
    lockMetal.color.set('#dfe6f2').lerp(new THREE.Color('#8a5232'), rust);
    lockMetal.metalness = lerp(0.95, 0.35, rust); lockMetal.roughness = lerp(0.22, 0.85, rust);
    const keyOk = pk(t, T.aDeneyin + 0.2, 0.35), keyBad = pk(t, T.aUymayan + 0.15, 0.3) * (0.6 + 0.4 * Math.sin(t * 30));
    lockMetal.emissive.copy(BLUE).lerp(GREEN, clamp(keyOk * 2)).lerp(REDG, clamp(Math.max(keyBad, rust * (0.5 + 0.5 * Math.sin(t * 5))) * 1.5));
    lockMetal.emissiveIntensity = 0.25 + 1.4 * pk(t, T.bKilit + 0.25, 0.3) + 1.2 * keyOk + 1.2 * keyBad + 0.5 * rust + 1.6 * pk(t, NEWLOCK + 0.5, 0.35);
    lockRim.material.opacity = 1 - rust;
    lockRim.material.color.copy(BLUE).multiplyScalar(3).lerp(GREEN.clone().multiplyScalar(3), clamp(keyOk * 2)).lerp(REDG.clone().multiplyScalar(3), clamp(keyBad * 2));
    ghostMat.opacity = 0; ghostLock.visible = false; ringMat.opacity = 0; renew.visible = false;

    // ---- the speed gauge from last episode: drops with the building, back after the restore
    gauge.visible = !(t > FALL0 - 0.1 && t < REST1 - 0.2);
    gauge.scale.setScalar(1);
    const sc = score(t);
    needle.rotation.z = Math.PI / 2 - Math.PI * sc / 100;
    const zone = sc < 50 ? 0 : sc < 90 ? 1 : 2;
    gSegs.forEach((m, k) => { m.opacity = k === zone && sc > 1 ? 1 : 0.32; });

    // ---- people walking straight in while the site is up
    const streamA = (1 - smooth(prog(t, T.bCok - 0.4, T.bCok + 0.3))) + smooth(prog(t, T.h0 - 0.5, T.h0 + 0.5));
    stream.forEach((P, i) => {
      const D = 6 * t - i * 3 + 30;
      const s = 30 - (D % 30);
      setPerson(P, qPos(Math.max(-0.9, s), P.jit), clamp(streamA) * smooth(clamp((30 - s) / 2.5)) * clamp(1 + s / 0.9), { walk: 1, t });
    });
    // ---- attackers: one slips in before the fall; later a group tries the rusty lock and leaves when it is new
    attackers.forEach((P, k) => {
      if (k === 0 && t < T.u0) {
        const s = lerp(16, -0.9, smooth(prog(t, T.cKotu - 0.5, T.cSizar + 0.4)));
        setPerson(P, qPos(s, -1.2), win(t, T.cKotu - 0.6, T.cSizar + 0.5, 0.3, 0.25) * clamp(1 + s / 0.9), { walk: 1, t, dark: 1 });
        return;
      }
      const t0 = T.uSaldir - 0.4 + k * 0.25, tOut = NEWLOCK + 0.5 + k * 0.12;
      const side = -3.65 + (k - 1.5) * 1.1, sIn = 1.6 + (k % 2) * 0.9;
      let s = lerp(15 + k * 2, sIn, smooth(prog(t, t0, t0 + 2.0)));
      if (t > tOut) s = lerp(sIn, 18, smooth(prog(t, tOut, tOut + 2.2)));
      const a = win(t, t0, tOut + 2.0, 0.4, 0.8);
      setPerson(P, qPos(s, side + 0.15 * Math.sin(t * 9 + k) * pk(t, T.uEskiK + 0.6, 0.6)), a, { walk: t < t0 + 2.0 || t > tOut ? 1 : 0, t, dark: 1 });
    });

    // ---- the safe: rises on "Yedek", opens, holds a copy of the building and the spare key
    const sUp = outBack(prog(t, T.k0 - 0.35, T.k0 + 0.3), 1.6);
    safe1.g.visible = sUp > 0.002;
    safe1.g.position.copy(SAFE1).add(new THREE.Vector3(0, -2.8 * (1 - clamp(sUp)), 0));
    const open = smooth(prog(t, T.kKopya - 0.2, T.kKopya + 0.4)) * (1 - smooth(prog(t, T.oAyni - 0.2, T.oAyni + 0.3)));
    safe1.doorPivot.rotation.y = -1.75 * open;
    safe1.inner.material.opacity = 0.85 * open;
    const sPulse = pk(t, REST0 + 0.4, 0.5) + 0.8 * pk(t, T.oBulut + 0.3, 0.4) + 0.7 * pk(t, T.uYedek + 0.3, 0.35) + 0.6 * pk(t, T.hOto + 0.2, 0.4);
    safe1.steel.emissiveIntensity = 0.06 + 0.5 * sPulse;
    safe1.rimMat.opacity = 0.7 + 0.3 * sPulse;
    safe1.dial.rotation.z = -6 * smooth(prog(t, T.kKopya - 0.6, T.kKopya - 0.1));
    const hA = win(t, T.kKopya + 0.1, REST0 + 0.4, 0.35, 0.4);
    holoMat.opacity = hA * (0.75 + 0.25 * Math.sin(t * 5));
    holo.visible = hA > 0.002;
    holo.position.copy(SAFE1).add(new THREE.Vector3(0, 3.4 + 0.15 * Math.sin(t * 1.8), 0)); holo.rotation.y = t * 0.6;
    holo.scale.setScalar(lerp(0.5, 1, outBack(prog(t, T.kKopya + 0.1, T.kKopya + 0.5), 1.6)));
    // the restore beam
    beamRestore.set(prog(t, REST0 - 0.35, REST0 + 0.35), win(t, REST0 - 0.35, REST1 + 0.3, 0.1, 0.5), t > REST0 + 0.3 && t < REST1 ? ((t - REST0) * 1.6) % 1 : -1);

    // ---- the keys
    const kRise = outBack(prog(t, T.kKasa - 0.2, T.kKasa + 0.4), 1.6);
    const toLock = smooth(prog(t, T.aDene - 0.1, T.aDene + 0.8));
    const gA = Math.max(win(t, T.kKasa - 0.2, T.kOlur + 0.3, 0.25, 0.4), win(t, T.aDene - 0.4, T.aDenen + 0.2, 0.3, 0.4));
    goldKey.g.visible = gA > 0.002; goldKey.mat.opacity = gA;
    if (goldKey.g.visible) {
      if (toLock <= 0) {
        goldKey.g.rotation.order = 'YXZ'; goldKey.g.rotation.set(0.25, t * 1.4, 0);
        goldKey.g.position.copy(SAFE1).add(new THREE.Vector3(-0.9, 4.0 + (t < T.oAyni ? 0 : 0.6) + 0.15 * Math.sin(t * 2.2), 0));
        goldKey.g.scale.setScalar(lerp(0.4, t < T.oAyni ? 1.05 : 0.8, clamp(kRise)));
      } else {
        const ins = smooth(prog(t, T.aDene + 0.8, T.aDene + 1.2)), turn = smooth(prog(t, T.aDeneyin - 0.1, T.aDeneyin + 0.35));
        keyInLock(goldKey, ins, -1.57 * turn);
        if (toLock < 1) {
          const from = SAFE1.clone().add(new THREE.Vector3(-0.9, 4.6, 0)), to = goldKey.g.position.clone();
          goldKey.g.position.copy(from.lerp(to, toLock)).add(new THREE.Vector3(0, Math.sin(Math.PI * toLock) * 3, 0));
        }
      }
    }
    const grey = prog(t, T.aDenen - 0.3, T.aDenen + 0.5);
    const yA = win(t, T.aDenen - 0.3, T.aEnd + 0.6, 0.25, 0.4);
    greyKey.g.visible = yA > 0.002; greyKey.mat.opacity = yA;
    if (greyKey.g.visible) {
      const ins = smooth(prog(t, T.aDenen + 0.4, T.aKilide + 0.2));
      const wob = Math.sin(t * 28) * 0.12 * win(t, T.aKilide + 0.1, T.aEnd + 0.1, 0.1, 0.2);
      const drop = smooth(prog(t, T.aEnd - 0.1, T.aEnd + 0.6));
      keyInLock(greyKey, ins * (1 - 0.7 * drop), wob * 0.6, wob);
      greyKey.g.position.y -= 2.2 * drop * drop; greyKey.g.position.z += (1 - smooth(grey)) * 4;
    }

    // ---- don't keep it in the same building: a ghost safe burns inside; a second copy goes up to the cloud
    const gsA = win(t, T.oAyni - 0.2, T.oBaska + 0.2, 0.3, 0.4);
    ghostSafeMat.opacity = gsA; ghostSafe.visible = gsA > 0.002;
    ghostSafeMat.color.copy(BLUE).multiplyScalar(2.2).lerp(REDG.clone().multiplyScalar(2.6), smooth(prog(t, T.oYan, T.oKasa + 0.2)));
    const cA = smooth(prog(t, T.oBaska - 0.3, T.oBaska + 0.6));
    cloudMat.opacity = 0.92 * cA; cloud.visible = cA > 0.002;
    cloud.position.copy(CLOUD).add(new THREE.Vector3(0, -3 * (1 - cA) + 0.25 * Math.sin(t * 0.9), 0));
    const s2 = outBack(prog(t, T.oBulut - 0.3, T.oBulut + 0.25), 1.7);
    safe2.g.visible = s2 > 0.002;
    safe2.g.position.copy(cloud.position).add(new THREE.Vector3(0, 1.2, 0)); safe2.g.scale.setScalar(0.95 * clamp(s2) + 1e-3);
    safe2.steel.emissiveIntensity = 0.06 + 0.5 * pk(t, T.oBulut + 1.0, 0.4) + 0.4 * pk(t, T.hNerede + 0.3, 0.4);
    beamCloud.set(prog(t, T.oBulut - 0.1, T.oBulut + 0.7), cA * (t > T.oBulut - 0.1 ? 1 : 0), t > T.oBulut + 0.7 ? ((t - T.oBulut) * 0.7) % 1 : -1);
    // ---- daily backups: the clock turns, a copy flies from the building to the safe
    const clA = win(t, T.a0 - 0.2, T.aDene + 0.2, 0.3, 0.4) + win(t, T.h0, T.hEnd + 0.3, 0.3, 0.4);
    clockMat.opacity = clamp(clA); clockFace.material.opacity = 0.85 * clamp(clA); clock.visible = clA > 0.002;
    clock.position.copy(SAFE1).add(new THREE.Vector3(-1.9, 5.0, 0.3)); clock.quaternion.copy(camera.quaternion);
    clockHand.rotation.z = -Math.PI * 2 * Math.max(0, t - T.a0) / 1.3;
    const dailyOn = win(t, T.aHer - 0.3, T.aDene, 0.2, 0.3) + win(t, T.uOnce - 0.3, NEWLOCK, 0.2, 0.3) + win(t, T.h0, T.END + 4, 0.4, 0.4);
    beamDaily.set(1, 0.55 * clamp(dailyOn), dailyOn > 0.01 ? ((t - T.aHer) / 1.3) % 1 : -1);
  }

  function render() { composer.render(); }

  const project = (v) => { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * W, y: (-tmpV.y * 0.5 + 0.5) * H, z: tmpV.z, behind: tmpV.z > 1 }; };

  const anchors = {
    sign: new THREE.Vector3(SIGN_A.x, 5.4, SIGN_A.z), heroTop: new THREE.Vector3(HERO.x, 8 * 3.4 + 2.5, HERO.z),
    gate: GATE.clone().setY(11), door: new THREE.Vector3(HERO.x, 4.2, HERO.z + 6.3), lock: () => lock.position.clone().setY(2.9),
    mailbox: MBOX.clone().setY(3.4), racks: new THREE.Vector3(HERO.x - 1.5, 6.2, HERO.z + 5),
    floor5: new THREE.Vector3(HERO.x + 7.6, 5 * 3.4 + 2.2, HERO.z + 6.3), floor3: new THREE.Vector3(HERO.x + 6.3, 3 * 3.4 + 2.2, HERO.z + 6.3),
    attacker: () => attackers[0].m.position.clone().setY(2.9), safe: SAFE1.clone().setY(3.6),
    holo: () => holo.position.clone().add(new THREE.Vector3(0, 3.2, 0)), key: () => goldKey.g.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
    ghostSafe: new THREE.Vector3(HERO.x + 3.4, 3.6, HERO.z + 3.2), cloud: () => cloud.position.clone().add(new THREE.Vector3(0, 4.2, 0)),
    clock: () => clock.position.clone().add(new THREE.Vector3(0, 1.2, 0)), gauge: new THREE.Vector3(HERO.x, 7.4, DOORZ + 0.5),
    attackers: () => attackers[2].m.position.clone().setY(3.0),
  };
  return { renderer, scene, camera, update, render, project, anchors, routes: { route1 }, canvas, GATE, HERO, score };
}

// ------------------------------------------------------------------ a glass tower built floor by floor
function towerGroup({ floors, w, d, fh, seed, glassTint }) {
  const group = new THREE.Group();
  const R = rng(seed * 1000 + 7);
  const slabMat = new THREE.MeshStandardMaterial({ color: '#8d99ad', roughness: 0.55, metalness: 0.15 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1d2432', roughness: 0.35, metalness: 0.8 });
  const levels = [];
  for (let f = 0; f < floors; f++) {
    const lvl = new THREE.Group(); lvl.position.y = f * fh;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.34, d + 0.6).translate(0, 0.17, 0), slabMat);
    slab.castShadow = true; slab.receiveShadow = true; lvl.add(slab);
    const tex = floorTexture(R, f === 0);
    const glassMat = new THREE.MeshStandardMaterial({ color: glassTint, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0, transparent: true, opacity: f === 0 ? 0.16 : 0.7, roughness: 0.06, metalness: 0.7, depthWrite: f !== 0 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, fh - 0.34, d).translate(0, 0.34 + (fh - 0.34) / 2, 0), glassMat);
    glass.castShadow = f !== 0; lvl.add(glass);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.36, fh, 0.36).translate(0, fh / 2, 0), frameMat);
      c.position.set(sx * w / 2, 0, sz * d / 2); lvl.add(c);
    }
    levels.push({ lvl, glassMat, slabMat });
    group.add(lvl);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6).translate(0, 0.25, 0), slabMat);
  roof.position.y = floors * fh; group.add(roof);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.12, d + 0.7), new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0 }));
  crown.position.y = floors * fh + 0.56; group.add(crown);
  function update(t, t0, dur, lights) {
    group.visible = t > t0;
    const step = dur / (floors + 1);
    levels.forEach(({ lvl, glassMat }, f) => {
      const k = prog(t, t0 + f * step, t0 + f * step + 0.45);
      lvl.visible = k > 0.001;
      lvl.position.y = f * fh + (1 - outCubic(k)) * -2.5;
      lvl.scale.set(lerp(0.85, 1, outBack(k, 1.4)), Math.max(0.001, outCubic(k)), lerp(0.85, 1, outBack(k, 1.4)));
      const on = prog(t, t0 + dur * 0.55 + f * 0.05, t0 + dur * 0.55 + f * 0.05 + 0.4);
      glassMat.emissiveIntensity = (f === 0 ? 0.28 : 1.1) * on * lights;
    });
    const rk = prog(t, t0 + floors * step, t0 + floors * step + 0.4);
    roof.visible = rk > 0.001; roof.scale.y = Math.max(0.001, rk);
    crown.material.opacity = prog(t, t0 + dur, t0 + dur + 0.4) * lights;
  }
  return { group, update };
}

// ------------------------------------------------------------------ route ribbon with a travelling head
function makeRoute(pts, radius) {
  const P = pts.map(([x, z]) => new THREE.Vector2(x, z));
  const samples = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const la = i === 0 ? 0 : radius, lb = i === P.length - 2 ? 0 : radius;
    const dir = b.clone().sub(a).normalize(), len = a.distanceTo(b);
    const s0 = a.clone().add(dir.clone().multiplyScalar(la)), s1 = a.clone().add(dir.clone().multiplyScalar(len - lb));
    const n = Math.max(2, Math.ceil((len - la - lb) / 1.5));
    for (let k = 0; k <= n; k++) samples.push(s0.clone().lerp(s1, k / n));
    if (i < P.length - 2) { // rounded corner
      const c = P[i + 1], nxt = P[i + 2].clone().sub(c).normalize();
      const e = c.clone().add(nxt.clone().multiplyScalar(radius));
      for (let k = 1; k < 10; k++) { const u = k / 10; const q0 = s1.clone().lerp(c, u), q1 = c.clone().lerp(e, u); samples.push(q0.lerp(q1, u)); }
    }
  }
  const L = [0];
  for (let i = 1; i < samples.length; i++) L.push(L[i - 1] + samples[i].distanceTo(samples[i - 1]));
  const total = L[L.length - 1];
  const pos = [], uv = [], idx = [], wdt = 2.1;
  samples.forEach((p, i) => {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize(), nrm = new THREE.Vector2(-t.y, t.x);
    pos.push(p.x + nrm.x * wdt, 0.5, p.y + nrm.y * wdt, p.x - nrm.x * wdt, 0.5, p.y - nrm.y * wdt);
    uv.push(L[i] / total, 0, L[i] / total, 1);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
    uniforms: { uProg: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 }, uPulse: { value: -1 }, uLen: { value: total }, uColor: { value: BLUE.clone() } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform float uProg, uAlpha, uTime, uPulse, uLen; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float s = vUv.x * uLen, head = uProg * uLen;
        float drawn = smoothstep(head + 0.5, head - 0.5, s);
        float across = abs(vUv.y - 0.5) * 2.0;
        float core = exp(-across*across*5.0);
        float edge = smoothstep(1.0, 0.8, across) * smoothstep(0.55, 0.9, across);
        float chev = fract((s - uTime * 9.0) / 4.0 - abs(vUv.y - 0.5) * 0.9);
        float arrows = smoothstep(0.0, 0.08, chev) * smoothstep(0.35, 0.22, chev);
        float headGlow = exp(-pow((s - head) / 2.5, 2.0)) * (1.0 - smoothstep(0.97, 1.0, uProg));   // no glow once fully drawn
        float pulse = uPulse < 0.0 ? 0.0 : exp(-pow((s - uPulse * uLen) / 5.0, 2.0));
        vec3 c = uColor * (0.9 * core + 1.2 * edge + 1.4 * arrows * core + 0.25) + vec3(0.8, 0.9, 1.0) * (headGlow * 2.6 + pulse * 3.2) * core;
        gl_FragColor = vec4(c * drawn * uAlpha, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(3), toneMapped: false, transparent: true }));
  const at = (u) => {
    const s = clamp(u) * total; let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const k = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    const p = samples[i - 1].clone().lerp(samples[i], k);
    return new THREE.Vector3(p.x, 1.1, p.y);
  };
  function set(p, alpha, t, pulse = -1) {
    mat.uniforms.uProg.value = p; mat.uniforms.uAlpha.value = alpha; mat.uniforms.uTime.value = t; mat.uniforms.uPulse.value = pulse;
    mesh.visible = alpha > 0.001 && p > 0.0005;
    head.position.copy(at(pulse >= 0 ? pulse : p));
    const drawing = (p > 0.001 && p < 0.999) || (pulse >= 0 && pulse < 0.999);
    head.visible = drawing && alpha > 0.05;
    head.material.opacity = alpha;
  }
  return { mesh, head, set, at, total };
}

// ------------------------------------------------------------------ textures
function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function textTexture([a, b], w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  let size = Math.round(h * 0.5);
  g.textBaseline = 'middle';
  for (;;) { g.font = `800 ${size}px Manrope`; if (g.measureText(a + b).width <= w * 0.84 || size < 20) break; size -= 2; }
  const wa = g.measureText(a).width, wb = g.measureText(b).width, x = (w - wa - wb) / 2;
  g.fillStyle = '#f3f6ff'; g.fillText(a, x, h * 0.53);
  g.fillStyle = '#3b8bff'; g.fillText(b, x + wa, h * 0.53);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function rackTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1118'; g.fillRect(0, 0, 256, 512);
  for (let u = 0; u < 10; u++) {
    const y = 512 - 40 - u * 47.5;
    g.fillStyle = '#1b222e'; g.fillRect(14, y - 40, 228, 42);
    g.fillStyle = '#10151d'; for (let k = 0; k < 18; k++) g.fillRect(96 + k * 8, y - 32, 4, 26);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function floorTexture(R, lobby) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 64);
  if (lobby) {
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(90,150,255,0.0)'); gr.addColorStop(1, 'rgba(90,150,255,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
  } else {
    for (let k = 0; k < 16; k++) {
      if (R() < 0.3) continue;
      const warm = R() < 0.75;
      g.fillStyle = warm ? `rgba(255,${190 + R() * 40 | 0},${120 + R() * 50 | 0},${0.55 + R() * 0.4})` : `rgba(170,205,255,${0.5 + R() * 0.4})`;
      g.fillRect(k * 32 + 3, 10, 26, 46);
    }
  }
  g.fillStyle = '#000'; for (let k = 0; k <= 16; k++) g.fillRect(k * 32 - 1, 0, 3, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------------ episode 2 textures
function labelTexture(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = '800 84px Manrope'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 18; g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function postcardTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 340;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f1e7'; g.fillRect(0, 0, 512, 340);
  g.strokeStyle = '#d9cfbd'; g.lineWidth = 3; g.beginPath(); g.moveTo(300, 40); g.lineTo(300, 300); g.stroke();
  g.fillStyle = '#e8553d'; g.fillRect(400, 30, 80, 96);                  // stamp
  g.fillStyle = '#f6f1e7'; g.fillRect(410, 40, 60, 76);
  g.fillStyle = '#e8553d'; g.font = '800 30px Manrope'; g.textAlign = 'center'; g.fillText('@', 440, 88);
  g.textAlign = 'left'; g.fillStyle = '#2a2f3a';
  g.font = '700 34px "JetBrains Mono"'; g.fillText('Şifre:', 34, 120); g.fillStyle = '#d23b2f'; g.fillText('1234', 34, 168);
  g.fillStyle = '#2a2f3a'; g.font = '500 24px "JetBrains Mono"'; g.fillText('Kart: 4531', 34, 230); g.fillText('•••• 8890', 34, 262);
  g.fillStyle = '#c9c0ae'; for (const y of [190, 240, 290]) g.fillRect(318, y, 160, 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
function lockboxTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#3b8bff'; g.lineWidth = 10; g.strokeRect(14, 14, 228, 228);
  g.fillStyle = '#9cc2ff'; g.fillRect(88, 116, 80, 64);                  // padlock
  g.lineWidth = 14; g.strokeStyle = '#9cc2ff'; g.beginPath(); g.arc(128, 116, 28, Math.PI, 0); g.stroke();
  g.fillStyle = '#000'; g.beginPath(); g.arc(128, 142, 9, 0, Math.PI * 2); g.fill(); g.fillRect(124, 142, 8, 22);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// ------------------------------------------------------------------ episode 3 textures
function plateTexture(text) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#0d1f44'; g.beginPath(); g.roundRect(6, 6, 628, 188, 28); g.fill();
  g.strokeStyle = '#5b9cff'; g.lineWidth = 6; g.stroke();
  let size = 74; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (;;) { g.font = `700 ${size}px "JetBrains Mono"`; if (g.measureText(text).width < 590 || size < 24) break; size -= 2; }
  const at = text.indexOf('@');
  if (at > 0) {
    const a = text.slice(0, at), b = text.slice(at);
    const wa = g.measureText(a).width, wb = g.measureText(b).width, x0 = 320 - (wa + wb) / 2;
    g.textAlign = 'left'; g.fillStyle = '#eef3ff'; g.fillText(a, x0, 104); g.fillStyle = '#7fb0ff'; g.fillText(b, x0 + wa, 104);
  } else { g.fillStyle = '#eef3ff'; g.fillText(text, 320, 104); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
function envelopeTexture(sealed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 330;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, 512, 330);
  g.strokeStyle = '#d6cdbd'; g.lineWidth = 6; g.beginPath(); g.moveTo(8, 8); g.lineTo(256, 190); g.lineTo(504, 8); g.stroke();
  g.fillStyle = '#c9bfad'; g.fillRect(40, 250, 180, 10); g.fillRect(40, 274, 130, 10);
  if (sealed) {
    g.fillStyle = '#1c73fd'; g.beginPath(); g.arc(256, 190, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#9cc2ff'; g.lineWidth = 8;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(256, 190, 44, -Math.PI / 2 + k * 2.094 + 0.2, -Math.PI / 2 + (k + 1) * 2.094 - 0.2); g.stroke(); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.beginPath(); g.moveTo(232, 192); g.lineTo(250, 210); g.lineTo(282, 172); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

// ------------------------------------------------------------------ episode 4 textures
function crateTexture(name, size, color) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1a2233'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = color; g.lineWidth = 16; g.strokeRect(14, 14, 484, 484);
  // a photo icon: frame, sun, mountains
  g.fillStyle = '#2b3a58'; g.beginPath(); g.roundRect(96, 70, 320, 220, 22); g.fill();
  g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(340, 130, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5b9cff'; g.beginPath(); g.moveTo(110, 276); g.lineTo(210, 160); g.lineTo(290, 250); g.lineTo(330, 210); g.lineTo(402, 276); g.closePath(); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color; g.font = '800 92px Manrope'; g.fillText(size, 256, 368);
  g.fillStyle = '#c7d3ea'; g.font = '700 40px "JetBrains Mono"'; g.fillText(name, 256, 446);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
function plateTexture2(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 140;
  const g = c.getContext('2d');
  g.fillStyle = '#1b2232'; g.beginPath(); g.roundRect(4, 4, 504, 132, 22); g.fill();
  g.strokeStyle = '#ff8a5c'; g.lineWidth = 5; g.stroke();
  g.fillStyle = '#e9edf5'; g.font = '700 58px "JetBrains Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 74);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
