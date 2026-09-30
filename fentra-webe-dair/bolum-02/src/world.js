// Episode 2 world: the Fentra city from episode 1, fully built, plus the lock on the door.
// HTTP = postcards anyone can read on the road, HTTPS = locked boxes, the certificate = the padlock on the door.
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
      s.setScalar(alpha < 0.01 ? 0.001 : 1);
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

  // ---------------------------------------------------------------- post
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.8, 0.5, 0.86);
  if (!Q.has('nobloom')) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  setBuildings(() => 1);

  // ================================================================ per-frame state (episode 2)
  const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
  const tmpV = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  function update(t) {
    const look = camera.position.length();
    scene.fog.density = Math.min(0.0052, 0.9 / look);
    skyU.uDay.value = 0; sky.position.copy(camera.position);
    renderer.toneMappingExposure = 1.05;

    // the city shimmers in on the title
    gridMat.uniforms.uWave.value = t < T.title - 0.3 ? 400 : lerp(0, 400, outCubic(prog(t, T.title - 0.3, T.title + 3)));
    gridMat.uniforms.uBase.value = 0.16;
    gridMat.uniforms.uFlash.value = 0.45 * pk(t, T.bYol + 0.6, 0.4);
    gridMat.uniforms.uRing.value = -100;
    setCars(t, 1);
    outlineMat.opacity = 0.75 + 0.25 * pk(t, T.bAdres + 0.2, 0.4);

    // sign (address), fully built; flashes on "adresini"
    ghostSign.material.opacity = 0;
    posts.forEach((p) => { p.scale.y = 1; });
    panelRig.position.y = 4.15; panelRig.visible = true; panel.scale.setScalar(1);
    panelFront.emissiveIntensity = 0.95 + 1.3 * pk(t, T.bAdres + 0.25, 0.3);
    signEdge.material.opacity = 1;
    sign.position.copy(SIGN_A); sign.rotation.y = 0.18; sign.visible = true;

    // servers in the lobby, blinking
    racks.forEach((r) => { r.position.y = 0; r.visible = true; });
    leds.visible = true;
    ledPos.forEach((p, k) => {
      const h = hash(k * 7.3), rate = 1.5 + 6 * hash(k * 3.1);
      const on = Math.sin(t * rate + h * 40) > -0.2 ? 1 : 0.15;
      leds.setColorAt(k, (h > 0.7 ? new THREE.Color('#58ff9c').multiplyScalar(1.8) : new THREE.Color('#3f86ff').multiplyScalar(1.6)).multiplyScalar(on));
    });
    leds.instanceColor.needsUpdate = true;
    sliceMat.opacity = 0; sliceEdges.material.opacity = 0;

    // the building, lit; flashes on "binasını"
    hero.update(t, -10, 1.5, 1 + 0.9 * pk(t, T.bBina + 0.25, 0.3));

    // the road: drawn on "yolunu", then always there
    const rd = inOut(prog(t, T.bYol - 0.05, T.bYol + 1.0));
    route1.set(rd, 0.55 * win(t, T.bYol - 0.1, T.END + 5, 0.1, 0.5), t, -1);
    gateLight.material.opacity = 0.9;

    // ---- the door and the padlock
    const closeK = inOut(prog(t, T.cKapi - 0.15, T.cKapi + 0.35));
    doorLeaf.rotation.y = lerp(-1.2, 0, closeK);
    const lockOn = (t0) => outBack(prog(t, t0, t0 + 0.45), 1.6);
    const on1 = lockOn(T.cKilit - 0.25), off1 = inOut(prog(t, T.w0 + 0.05, T.w0 + 0.55)), on2 = lockOn(T.pUcretsiz + 0.45);
    let lockK = t < T.w0 ? on1 : t < T.pUcretsiz + 0.45 ? 1 - off1 : on2;
    lock.visible = lockK > 0.001;
    const dropFrom = t < T.w0 ? 4.5 : t < T.pUcretsiz ? 0 : 4.5;
    lock.position.copy(LOCKP).add(new THREE.Vector3(0, (1 - clamp(lockK)) * dropFrom + (t >= T.w0 && t < T.pUcretsiz ? off1 * 3 : 0), 0));
    lock.rotation.z = t >= T.w0 && t < T.pUcretsiz ? off1 * 0.9 : (1 - clamp(lockK)) * -0.5;
    lock.scale.setScalar(Math.max(0.001, t >= T.w0 && t < T.pUcretsiz ? 1 - off1 * 0.6 : lerp(0.6, 1, clamp(lockK))));
    const clickA = T.cKilit + 0.2, clickB = T.pUcretsiz + 0.9;
    shackle.position.y = 0.7 + 0.45 * (1 - Math.max(prog(t, clickA - 0.08, clickA), t > T.pUcretsiz ? prog(t, clickB - 0.08, clickB) : 0)) * (t < T.w0 || t > T.pUcretsiz ? 1 : 0);
    const flash = pk(t, clickA + 0.1, 0.25) + pk(t, clickB + 0.1, 0.25) + 0.8 * pk(t, T.pKilitli + 0.3, 0.35);
    lockMetal.emissiveIntensity = 0.25 * (t < T.w0 || t > T.pUcretsiz ? clamp(lockK) : 0) + 1.5 * flash;
    lockRim.material.opacity = clamp(lockK) * (t < T.w0 || t > T.pUcretsiz ? 1 : 1 - off1);
    ghostMat.opacity = 0.9 * win(t, T.bKilit - 0.2, T.hTel, 0.25, 0.4) * (0.6 + 0.4 * Math.sin(t * 6));
    ghostLock.visible = ghostMat.opacity > 0.002;
    // renewal ring on "kendiliğinden yeniler"
    const rn = win(t, T.pYeniler - 0.15, T.pAdres + 0.6, 0.3, 0.5);
    ringMat.opacity = rn; renew.visible = rn > 0.002;
    renew.rotation.z = -t * 4.2;
    // door light: warm while open, red without a certificate, blue once locked
    const warm = new THREE.Color('#ffc58a'), red = new THREE.Color('#ff4d45'), blue = new THREE.Color('#9cc2ff');
    const redK = win(t, T.w0 + 0.3, T.p0 + 0.6, 0.4, 0.6);
    const blueK = t < T.w0 ? prog(t, clickA, clickA + 0.4) : prog(t, clickB, clickB + 0.4);
    const dc = warm.clone().lerp(blue, blueK).lerp(red, redK);
    doorMat.color.copy(dc).multiplyScalar(0.55 + 0.9 * flash + 0.4 * redK);
    doorMat.opacity = t > T.b0 ? 0.9 : 0;
    heroGlow.color.copy(dc); heroGlow.intensity = 1.5 + 30 * flash + 22 * redK;
    heroGlow.position.set(HERO.x, 3, DOORZ + 3);

    // ---- visitors: they come to the door and turn back when there is no lock
    const vA = win(t, T.w0 + 0.2, T.wEnd, 0.4, 0.4);
    visitors.forEach((v, k) => {
      v.visible = vA > 0.002;
      if (!v.visible) return;
      const go = inOut(prog(t, T.w0 + 0.3 + k * 0.35, T.wCogu + 0.2 + k * 0.12));
      const back = inOut(prog(t, T.wCogu + 0.25 + k * 0.15, T.wGoogle + 1.2 + k * 0.15));
      const z = lerp(36 + k * 2.2, 7.6 + (k % 3) * 0.9, go) + back * (26 + k * 2);
      v.position.set(HERO.x + (k - 2.5) * 1.35, 0.32 + 0.1 * Math.abs(Math.sin(t * 7 + k)), z);
      v.rotation.y = back > 0.05 ? Math.PI : 0;
      v.userData.mat.opacity = vA;
      v.userData.mat.emissive.set(back > 0.05 ? '#ff5a4f' : '#ffd9a8');
      v.userData.mat.emissiveIntensity = back > 0.05 ? 0.9 : 0.55;
    });

    // ---- the café's Wi-Fi
    const wA = win(t, T.hKafe - 0.3, T.sEnd + 0.4, 0.35, 0.4);
    wifi.visible = wA > 0.002;
    wifi.quaternion.copy(camera.quaternion);
    wifiParts.forEach((m, k) => { const ph = ((t * 1.3 - k * 0.22) % 1 + 1) % 1; m.material.opacity = wA * (k === 3 ? 1 : 0.35 + 0.65 * Math.exp(-ph * 5)); });
    wifi.scale.setScalar(1 + 0.25 * pk(t, T.hWifi + 0.15, 0.25));

    // ---- packets: postcards (HTTP) that turn into locked boxes (HTTPS)
    const route = route1;
    const flowA = Math.max(win(t, T.hTel - 0.2, T.sEnd + 0.5, 0.6, 0.5), win(t, T.p0 + 0.3, T.END + 5, 0.6, 0.5));
    const speed = 16 / route.total;
    const tmp = new THREE.Vector3();
    packets.forEach((p, i) => {
      let u = ((p.ph + t * speed) % 1 + 1) % 1;
      const edgeFade = smooth(clamp(u / 0.04)) * smooth(clamp((0.97 - u) / 0.05));
      const a = flowA * edgeFade;
      p.g.visible = a > 0.002;
      if (!p.g.visible) return;
      p.g.position.copy(route.at(u)).setY(2.3 + 0.25 * Math.sin(t * 3 + i));
      const boxK = t > T.p0 ? 1 : smooth(prog(t, T.sKutu + i * 0.03, T.sKoyar + i * 0.03));
      p.card.visible = boxK < 0.999; p.box.visible = boxK > 0.001;
      p.card.scale.setScalar(Math.max(0.001, 1 - boxK));
      p.box.scale.setScalar(Math.max(0.001, outBack(boxK, 1.8)));
      p.card.quaternion.copy(camera.quaternion);
      p.box.rotation.set(0.35, t * 0.9 + i, 0);
      cardMat.opacity = a; boxMat.opacity = a; edgeMat.opacity = a;
    });
    cardMat.opacity = flowA; boxMat.opacity = flowA; edgeMat.opacity = flowA;

    // ---- the magnifier: reads a postcard, can't read a box
    const mA = win(t, T.hKafe - 0.2, T.sEnd + 0.3, 0.4, 0.4);
    mag.visible = mA > 0.002;
    mag.quaternion.copy(camera.quaternion);
    mag.position.copy(MAGP).add(new THREE.Vector3(Math.sin(t * 1.3) * 0.4, Math.sin(t * 2.1) * 0.25 + (1 - smooth(clamp(mA))) * 4, 0));
    const reading = win(t, T.hOku - 0.2, T.sKutu, 0.25, 0.3);
    magRingMat.emissiveIntensity = 1.6 * reading + 0.6 * win(t, T.sGecir - 0.2, T.sEnd, 0.3, 0.3);
    // the box that gets picked up
    const gA = win(t, T.sYolda + 0.2, T.sEnd + 0.1, 0.3, 0.4);
    grab.g.visible = gA > 0.002;
    grab.card.visible = false; grab.box.visible = true;
    if (grab.g.visible) {
      const liftK = inOut(prog(t, T.sYolda + 0.2, T.sGecir + 0.3)), dropK = inOut(prog(t, T.sEnd - 0.6, T.sEnd + 0.1));
      tmp.set(-42, 2.3, 66);
      grab.g.position.copy(tmp).lerp(MAGP.clone().add(new THREE.Vector3(0, -3.2, 0.6)), liftK * (1 - dropK));
      grab.box.rotation.set(0.35 + t * 0.6, t * 1.4, 0);
      grab.box.scale.setScalar(1.15);
    }
  }

  function render() { composer.render(); }

  const project = (v) => { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * W, y: (-tmpV.y * 0.5 + 0.5) * H, z: tmpV.z, behind: tmpV.z > 1 }; };

  const anchors = {
    sign: new THREE.Vector3(SIGN_A.x, 5.4, SIGN_A.z), heroTop: new THREE.Vector3(HERO.x, 8 * 3.4 + 2.5, HERO.z),
    heroMid: new THREE.Vector3(HERO.x, 12, HERO.z), gate: GATE.clone().setY(11), routeMid: new THREE.Vector3(-42, 1, 60),
    door: new THREE.Vector3(HERO.x, 2.2, HERO.z + 6.3), lock: () => lock.getWorldPosition(new THREE.Vector3()),
    cafe: CAFE.clone().setY(6), wifi: () => wifi.position.clone(), mag: () => mag.position.clone(), servers: new THREE.Vector3(HERO.x, 5.8, HERO.z),
    visitor: (k) => visitors[k].position.clone(),
  };
  return { renderer, scene, camera, update, render, project, anchors, routes: { route1 }, canvas, GATE, HERO };
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
