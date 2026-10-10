// Season 2, episode 1 world: the city of season 1 (sign, building, road, lock, mailboxes, the shop, the CDN branches, the safes,
// the map pin), plus the guide (Google): its tower with the record book on top (the index), a searchlight, link arcs between
// buildings and the crawlers that follow them, your site's other pages, and the avenue where the first page lives.
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
const HQ = new THREE.Vector3(0, 0, -56);                              // the guide's tower (block 0,-2)

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
    if (BRANCH.some(([x, z]) => Math.abs(b.x - x) < 9 && Math.abs(b.z - z) < 9) || (Math.abs(b.x - HQ.x) < 10 && Math.abs(b.z - HQ.z) < 10)) b.h = 0.001;
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

  // ================================================================ episode 6 objects: map pins, people searching on their phones,
  // customers leaving reviews, and a "closed" sign on the door
  // ---------------------------------------------------------------- map pins
  const makePin = (color, scale = 1) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2, transparent: true });
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), mat); head.position.y = 2.2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.86, 1.9, 32, 1, true).rotateX(Math.PI).translate(0, 1.0, 0), mat);
    const dotMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 12), dotMat); dot.position.set(0, 2.2, 0.75);
    g.add(head, tip, dot);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 48).rotateX(-Math.PI / 2), ringMat);
    scene.add(g, ring);
    return { g, mat, dotMat, ring, ringMat, scale };
  };
  if (Q.has('dbg')) window.__bld = bld.map((b) => [b.x, b.z, b.w, b.d, b.h]);
  const heroPin = makePin('#1c73fd', 3.2);
  // competitors: the shop next door and a handful of buildings around the city
  // one per block around the hero, spread over the whole map view (the nearest building's roof in each block)
  const RIVAL_AT = [[-56, -56], [56, -56], [0, -84], [-56, 22], [56, 26], [28, -28], [-28, 4]];
  const rivalSpots = RIVAL_AT.map(([x, z]) => bld.filter((b) => b.h > 1).sort((a, c) => Math.hypot(a.x - x, a.z - z) - Math.hypot(c.x - x, c.z - z))[0]).map((b) => [b.x, b.h, b.z]);
  const rivals = [[SHOP.x, 4.6, SHOP.z], ...rivalSpots].map(([x, h, z], k) => {
    const p = makePin('#ea4b3f', k === 0 ? 1.4 : 3.0); p.base = new THREE.Vector3(x, h + 0.4, z); return p;
  });
  // ---------------------------------------------------------------- people searching on their phones in the square
  const phoneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bcd6ff').multiplyScalar(1.6), toneMapped: false, transparent: true });
  const SEARCH = [[-2.4, 22.5], [-0.6, 24.6], [1.5, 23.0], [3.1, 25.6], [-1.7, 26.8], [0.9, 27.9]];
  const searchers = SEARCH.map(([x, z], k) => {
    const P = qPerson(k + 160);
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.6), phoneMat); ph.position.set(0.32, 1.55, 0.42); ph.rotation.x = -0.6; P.m.add(ph);
    return { ...P, home: new THREE.Vector3(x, 0.32, z) };
  });
  // customers leaving through the door, each with a review
  const reviewers = [...Array(5)].map((_, k) => qPerson(k + 190));
  // ---------------------------------------------------------------- a "closed" sign on the door (holiday hours)
  const closedMat = new THREE.MeshBasicMaterial({ map: labelTexture('KAPALI', '#ff6a5f'), transparent: true, toneMapped: false, opacity: 0 });
  const closedBg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), new THREE.MeshStandardMaterial({ color: '#2a0f12', roughness: 0.6, transparent: true, opacity: 0 }));
  const closedSign = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.85), closedMat);
  closedBg.position.set(HERO.x, 2.0, DOORZ + 0.3); closedSign.position.set(HERO.x, 2.0, DOORZ + 0.32);
  scene.add(closedBg, closedSign);
  const visitor = qPerson(230);                         // the one who finds the door closed

  // ================================================================ season 2, episode 1 objects: the guide's tower with its record
  // book (the index), its searchlight, link arcs between buildings, the crawlers that follow them, the site's pages, the avenue
  // ---------------------------------------------------------------- the guide's tower
  const hq = towerGroup({ floors: 14, w: 10, d: 10, fh: 3.8, seed: 9, glassTint: '#4a74b8' });
  hq.group.position.set(HQ.x, 0, HQ.z); scene.add(hq.group);
  hq.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const HQ_TOP = 14 * 3.8 + 0.6;
  const hqStripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9cc2ff').multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0 });
  const hqStrips = [[-5.36, 5.36], [5.36, 5.36], [-5.36, -5.36], [5.36, -5.36]].map(([x, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, HQ_TOP, 0.18).translate(0, HQ_TOP / 2, 0), hqStripMat); m.position.set(HQ.x + x, 0, HQ.z + z); scene.add(m); return m;
  });
  // ---------------------------------------------------------------- the record book on top (the index)
  const book = new THREE.Group();
  const BOOK_W = 11, BOOK_D = 8;
  const pageTex = bookPageTexture();
  const pageMat = new THREE.MeshBasicMaterial({ map: pageTex, color: new THREE.Color('#ffffff').multiplyScalar(1.15), toneMapped: false, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const coverMat = new THREE.MeshStandardMaterial({ color: '#0f1a30', emissive: BLUE, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0 });
  const pages = [-1, 1].map((sd) => {
    const hinge = new THREE.Group(); book.add(hinge);
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(BOOK_W, BOOK_D).rotateX(-Math.PI / 2).translate(sd * BOOK_W / 2, 0.12, 0), pageMat);
    const cv = new THREE.Mesh(new THREE.BoxGeometry(BOOK_W + 0.5, 0.22, BOOK_D + 0.6).translate(sd * (BOOK_W + 0.5) / 2, -0.02, 0), coverMat);
    pg.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = (sd > 0 ? 0.5 : 0) + v * 0.5; });   // each page shows its half of the spread
    hinge.add(pg, cv); return { hinge, pg, sd };
  });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, BOOK_D + 0.6, 16).rotateX(Math.PI / 2), coverMat); book.add(spine);
  // twelve entry rows on the right page that light up one by one (a site: search lists them)
  const rowMats = [], rows = [];
  for (let k = 0; k < 12; k++) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5ea0ff').multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const r = new THREE.Mesh(new THREE.PlaneGeometry(BOOK_W * 0.78, 0.36).rotateX(-Math.PI / 2), m);
    r.position.set(BOOK_W * 0.5, 0.16, -BOOK_D / 2 + 0.85 + k * 0.56); pages[1].hinge.add(r); rowMats.push(m); rows.push(r);
  }
  const BOOK_POS = new THREE.Vector3(HQ.x, HQ_TOP + 3.2, HQ.z);
  book.position.copy(BOOK_POS); book.rotation.x = 0.62; scene.add(book);
  const bookGlow = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), new THREE.MeshBasicMaterial({ map: radialTexture(), color: new THREE.Color('#3b82ff').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  bookGlow.position.copy(BOOK_POS).add(new THREE.Vector3(0, 0, -1.5)); scene.add(bookGlow);
  // the card for your site that the crawler carries into the book
  const siteCardTex = textTexture(['websiteniz', '.com'], 1024, 256);
  const siteCard = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: siteCardTex, color: new THREE.Color('#ffffff').multiplyScalar(1.3), toneMapped: false, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  const siteCardBg = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.4), new THREE.MeshBasicMaterial({ color: '#0d1a33', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  const siteCardEdge = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.6), new THREE.MeshBasicMaterial({ color: BLUE.clone().multiplyScalar(2.6), toneMapped: false, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  siteCardBg.position.z = -0.01; siteCardEdge.position.z = -0.02;
  const siteCardG = new THREE.Group(); siteCardG.add(siteCardEdge, siteCardBg, siteCard); scene.add(siteCardG);
  // ---------------------------------------------------------------- the searchlight: one sweeping beam, then three pointing at addresses
  const beamMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uAlpha: { value: 0 }, uColor: { value: new THREE.Color('#8fb8ff') } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uAlpha; uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float along = clamp(-vY / 1.0, 0.0, 1.0); float face = abs(dot(vN, vV));
        float a = uAlpha * pow(face, 1.6) * (0.35 + 0.65 * (1.0 - along)) * smoothstep(0.0, 0.04, along);
        gl_FragColor = vec4(uColor * a, 1.0); }`,
  });
  const makeBeam = () => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 40, 1, true).translate(0, -0.5, 0), beamMat());
    const spotM = new THREE.MeshBasicMaterial({ map: radialTexture(), color: new THREE.Color('#9cc2ff').multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), spotM);
    scene.add(m, spot);
    const up = new THREE.Vector3(0, -1, 0);
    const set = (from, to, radius, alpha) => {
      m.visible = spot.visible = alpha > 0.002;
      if (!m.visible) return;
      const d = to.clone().sub(from), L = d.length();
      m.position.copy(from); m.quaternion.setFromUnitVectors(up, d.normalize()); m.scale.set(radius, L, radius);
      m.material.uniforms.uAlpha.value = alpha;
      spot.position.set(to.x, 0.45 + Math.max(0, to.y), to.z); spot.scale.setScalar(radius * 2.6); spotM.opacity = alpha * 0.9;
    };
    return { set };
  };
  const beams = [makeBeam(), makeBeam(), makeBeam()];
  // ---------------------------------------------------------------- the site's other pages: small pavilions beside the tower
  // a row on the tower's right: /hizmetler, /iletisim, then /kampanya at the front, which no link reaches
  const PAGES = [['/hizmetler', 8.45, -4.6, 3], ['/iletisim', 8.45, -0.6, 2], ['/kampanya', 8.45, 3.4, 3]];
  const pavs = PAGES.map(([name, x, z, fl], k) => {
    const tg = towerGroup({ floors: fl, w: 2.9, d: 2.9, fh: 2.5, seed: 30 + k, glassTint: '#3d5f96' });
    tg.group.position.set(x, 0, z); scene.add(tg.group);
    tg.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { ...tg, name, top: new THREE.Vector3(x, fl * 2.5 + 0.6, z), fl };
  });
  // ---------------------------------------------------------------- link arcs between buildings, and the crawlers that follow them
  const roof = (b) => new THREE.Vector3(b.x, b.h + 0.4, b.z);
  const nearestB = (x, z) => bld.filter((b) => b.h > 3 && !(Math.abs(b.x - HQ.x) < 10 && Math.abs(b.z - HQ.z) < 10)).sort((a, c) => Math.hypot(a.x - x, a.z - z) - Math.hypot(c.x - x, c.z - z))[0];
  const XB = [[-33, -5], [23, 0], [-23, 33], [33, 30], [-51, -28], [51, 5], [-5, -28], [32, -28]].map(([x, z]) => roof(nearestB(x, z)));
  const HERO_ROOF = new THREE.Vector3(HERO.x + 3.6, 8 * 3.4 + 0.9, HERO.z + 2.6);   // a roof corner, clear of the map pin
  const HQ_OUT = BOOK_POS.clone().add(new THREE.Vector3(0, -1.2, 3));
  // the main crawler's route: book → a building → another → your tower → your pages (never /kampanya)
  const ROUTE = [[HQ_OUT, XB[6], 16], [XB[6], XB[0], 9], [XB[0], HERO_ROOF, 10], [HERO_ROOF, pavs[0].top, 5], [pavs[0].top, pavs[1].top, 3.5]];
  // the web of links: the route plus links between other buildings (none reaches /kampanya)
  const WEB = [[XB[1], HERO_ROOF, 9], [XB[2], XB[0], 8], [XB[3], XB[1], 8], [XB[4], XB[0], 9], [XB[5], XB[1], 7], [XB[7], XB[6], 7], [XB[2], HERO_ROOF, 12], [XB[3], XB[5], 9]];
  // a link: a glowing tube drawn from one roof to another (thicker than the beams of season 1, so it reads from far away)
  const linkArc = (a, b, h, color, radius) => {
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, h, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 80, radius, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
    const set = (prog, alpha) => { mesh.visible = alpha > 0.002 && prog > 0.002; mat.opacity = alpha; geo.setDrawRange(0, Math.floor(clamp(prog) * 80) * 8 * 6); };
    return { set, curve, mesh };
  };
  const routeArcs = ROUTE.map(([a, b, h]) => linkArc(a, b, h, BLUE, 0.34));
  const webArcs = WEB.map(([a, b, h]) => linkArc(a, b, h, new THREE.Color('#5b8cff'), 0.24));
  // a crawler: a bright orb with a fading trail
  const crawlMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#d6e6ff').multiplyScalar(3.2), toneMapped: false, transparent: true });
  const makeCrawler = () => {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 14), crawlMat.clone());
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshBasicMaterial({ map: radialTexture(), color: new THREE.Color('#6fa6ff').multiplyScalar(1.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    const trail = [...Array(9)].map((_, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.75 * (1 - k / 10), 10, 8), crawlMat.clone()); scene.add(m); return m; });
    scene.add(head, halo);
    const set = (curves, s, alpha, tl = 0.035) => {
      const pt = (u) => { const n = curves.length, v = clamp(u, 0, n - 1e-4), i = Math.floor(v); return curves[i].getPoint(v - i); };
      const vis = alpha > 0.002;
      head.visible = halo.visible = vis; trail.forEach((m) => { m.visible = vis; });
      if (!vis) return;
      head.position.copy(pt(s)); head.material.opacity = alpha;
      halo.position.copy(head.position); halo.quaternion.copy(camera.quaternion); halo.material.opacity = 0.7 * alpha;
      trail.forEach((m, k) => { m.position.copy(pt(s - (k + 1) * tl)); m.material.opacity = alpha * (0.75 - k * 0.075); });
    };
    return { set, head };
  };
  const crawlers = [makeCrawler(), makeCrawler(), makeCrawler()];
  const routeCurves = routeArcs.map((a) => a.curve);
  const backCurve = new THREE.QuadraticBezierCurve3(pavs[1].top.clone(), pavs[1].top.clone().lerp(HQ_OUT, 0.5).add(new THREE.Vector3(0, 26, 0)), BOOK_POS.clone().add(new THREE.Vector3(0, 0.6, 0)));
  // a scan band sliding down your tower while the crawler reads it
  const scanMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fd0ff').multiplyScalar(1.3), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const scan = new THREE.Mesh(new THREE.BoxGeometry(13.3, 0.18, 13.3), scanMat); scene.add(scan);
  // ---------------------------------------------------------------- the avenue (first page) and the back street (second page)
  const avenueMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uA: { value: 0 }, uT: { value: 0 }, uColor: { value: BLUE.clone() } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uA, uT; uniform vec3 uColor; varying vec2 vUv;
      void main(){ float across = abs(vUv.y - 0.5) * 2.0; float edge = smoothstep(0.75, 0.95, across) * (1.0 - smoothstep(0.95, 1.0, across));
        float x = vUv.x * 140.0; float chev = fract((x + uT * 10.0) / 6.0 - abs(vUv.y - 0.5) * 0.8);
        float arrows = smoothstep(0.0, 0.08, chev) * smoothstep(0.32, 0.2, chev) * (1.0 - across);
        float fade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        gl_FragColor = vec4(uColor * (1.4 * edge + 1.1 * arrows + 0.12) * fade * uA, 1.0); }`,
  });
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(140, 6.4).rotateX(-Math.PI / 2), avenueMat);
  avenue.rotation.y = Math.PI;                         // arrows run towards rank 1 (west)
  avenue.position.set(0, 0.42, 14); scene.add(avenue);
  const backMat = new THREE.MeshBasicMaterial({ color: '#05070c', transparent: true, opacity: 0, depthWrite: false });
  const backSt = new THREE.Mesh(new THREE.PlaneGeometry(150, 9).rotateX(-Math.PI / 2), backMat); backSt.position.set(0, 0.44, -14); scene.add(backSt);
  // the ten buildings along the avenue (your tower among them) and five on the back street
  const AVE = [...bld.filter((b) => b.h > 1 && Math.abs(b.z) <= 11 && Math.abs(b.x) <= 70).map((b) => ({ p: roof(b), hero: false })), { p: HERO_ROOF.clone(), hero: true }].sort((a, c) => a.p.x - c.p.x);
  const BACK = bld.filter((b) => b.h > 1 && b.z >= -40 && b.z <= -16 && Math.abs(b.x) <= 70).map((b) => roof(b)).sort((a, c) => a.x - c.x);

  // ---------------------------------------------------------------- post
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.8, 0.5, 0.86);
  if (!Q.has('nobloom')) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  setBuildings(() => 1);

  // ================================================================ per-frame state (season 2, episode 1)
  const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
  const tmpV = new THREE.Vector3();
  const groundY = (x, z) => (Math.abs(x - Math.round(x / PITCH) * PITCH) <= HALF && Math.abs(z - Math.round(z / PITCH) * PITCH) <= HALF ? 0.32 : 0.02);
  const QZ0 = DOORZ + 1.7;
  const qPos = (s, side = 0) => { const x = HERO.x + side, z = QZ0 + s; return new THREE.Vector3(x, groundY(x, z), z); };
  const WARM = new THREE.Color('#ffd9a8'), PCOL = new THREE.Color('#b9c6dc'), DARK = new THREE.Color('#0d1016'), RED = new THREE.Color('#ff3b30');
  function setPerson(P, pos, a, { glow = 0, walk = 0, t = 0, scale = 1, dark = 0, face = null } = {}) {
    P.m.visible = a > 0.01;
    if (!P.m.visible) return;
    P.m.position.copy(pos);
    P.m.position.y += walk * Math.abs(Math.sin(t * 9 + P.ph)) * 0.12;
    P.m.rotation.set(0, face ?? 0, Math.sin(t * 1.3 + P.ph) * 0.03 + walk * Math.sin(t * 9 + P.ph) * 0.06);
    P.m.scale.setScalar(0.92 * scale);
    P.mat.opacity = a;
    P.mat.color.copy(PCOL).lerp(DARK, dark);
    P.mat.emissive.copy(WARM).lerp(RED, dark);
    P.mat.emissiveIntensity = (0.1 + 0.5 * glow) * P.emi * (1 - dark) + dark * 0.4;
  }
  const levels = hero.group.children.slice(0, 8);
  const LOCKW = new THREE.Vector3(HERO.x - 2.9 - 0.75, 1.75, DOORZ + 0.55);
  const HERO_PIN = new THREE.Vector3(HERO.x, 8 * 3.4 + 1.2, HERO.z);
  const score = () => 94;
  // piecewise route parameter: [time, s] keys, eased inside each segment
  const along = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, s0] = keys[i], [t1, s1] = keys[i + 1];
      if (t <= t1) return lerp(s0, s1, inOut(prog(t, t0, t1)));
    }
    return keys[keys.length - 1][1];
  };
  // the main crawler: out of the book, along the links to your tower (it reads it), to /hizmetler and /iletisim; later it
  // carries your card back into the book. Never to /kampanya.
  const P1AT = T.cBag + 1.8, P2AT = T.cHic + 0.35;               // arrivals at /hizmetler and /iletisim
  const MAIN = [[T.cGez - 0.1, 0], [T.cGez + 1.4, 1], [T.cSayfa + 0.6, 2], [T.cBag + 0.3, 3], [T.cBag + 1.2, 3], [P1AT, 4], [P2AT, 5],
    [T.iOkur + 0.4, 5], [T.iEkler + 0.1, 6]];
  const SCAN0 = T.cBag + 0.35, SCAN1 = T.cBag + 1.15;             // the crawler reads your tower, floor by floor
  const CARD0 = T.iOkur - 0.1;                                    // your card appears at the crawler
  const BUILD0 = T.g0 - 0.15;                                     // the guide's tower rises
  const OPEN0 = BUILD0 + 1.75;                                    // its book opens
  const RANKS = [T.r0 + 0.2, T.rUygun, T.rGuven, T.rHizli, T.rTel];   // your rank improves with each criterion: 9 → 7 → 5 → 3 → 1
  const myRank = (t) => [9, 7, 5, 3, 1][RANKS.filter((w) => t > w + 0.1).length - 1] ?? 9;

  function update(t) {
    const look = camera.position.length();
    scene.fog.density = Math.min(0.0052, 0.9 / look);
    skyU.uDay.value = 0; sky.position.copy(camera.position);
    renderer.toneMappingExposure = 1.05;
    gridMat.uniforms.uWave.value = t < T.title - 0.3 ? 400 : lerp(0, 400, outCubic(prog(t, T.title - 0.3, T.title + 3)));
    const mapK = win(t, T.r0 - 0.2, T.rEnd + 0.3, 0.6, 0.6) + win(t, T.x0 - 0.2, T.END + 5, 0.8, 0.5);
    gridMat.uniforms.uBase.value = 0.16 + 0.3 * clamp(mapK);
    gridMat.uniforms.uFlash.value = 0.4 * pk(t, T.bKur + 0.3, 0.4) + 0.4 * pk(t, T.xReh + 0.3, 0.4);
    gridMat.uniforms.uRing.value = -100;
    setCars(t, 1);
    outlineMat.opacity = 0.75;
    // "bütün internete bakmaz": the city's windows go dark while the book is searched
    bUniforms.uDim.value = 0.85 * win(t, T.iBakmaz - 0.4, T.iOlmayan + 0.2, 0.4, 0.5);

    // ---- the city as season 1 left it
    ghostSign.material.opacity = 0;
    posts.forEach((p) => { p.scale.y = 1; });
    panelRig.position.y = 4.15; panelRig.visible = true; panel.scale.setScalar(1);
    panelFront.emissiveIntensity = 0.95 + 1.0 * pk(t, T.b0 + 0.2, 0.3);
    signEdge.material.opacity = 1;
    sign.position.copy(SIGN_A); sign.rotation.y = 0.18; sign.visible = true;
    route1.set(1, 0.5 * (1 - win(t, T.r0 - 0.3, T.rEnd + 0.3, 0.4, 0.5)), t, -1);
    gateLight.material.opacity = 0.9;
    wifi.visible = false; mag.visible = false; grab.g.visible = false;
    packets.forEach((p) => { p.g.visible = false; });
    visitors.forEach((v) => { v.visible = false; });
    ghostBoxMat.opacity = 0; ghostBox.visible = false;
    mailbox.g.visible = true; mailbox.g.position.copy(MBOX); mailbox.g.scale.setScalar(1);
    mailbox.bodyMat.emissiveIntensity = 0.12; mailbox.plateMat.opacity = 1; mailbox.flag.rotation.x = 0;
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
    safe1.g.visible = true; safe1.g.position.copy(SAFE1); safe1.doorPivot.rotation.y = 0; safe1.inner.material.opacity = 0;
    safe1.steel.emissiveIntensity = 0.06; safe1.rimMat.opacity = 0.8;
    cloud.visible = true; cloudMat.opacity = 0.92; cloud.position.copy(CLOUD).add(new THREE.Vector3(0, 0.25 * Math.sin(t * 0.9), 0));
    safe2.g.visible = true; safe2.g.position.copy(cloud.position).add(new THREE.Vector3(0, 1.2, 0)); safe2.g.scale.setScalar(0.95); safe2.steel.emissiveIntensity = 0.06;
    ghostSafe.visible = false; holo.visible = false; goldKey.g.visible = false; greyKey.g.visible = false; clock.visible = false;
    rubble.visible = false; sparks.visible = false; fires.forEach((m) => { m.visible = false; });
    beamRestore.set(0, 0); beamCloud.set(1, 0.35, ((t * 0.5) % 1)); beamDaily.set(0, 0);
    attackers.forEach((P) => { P.m.visible = false; });

    // ---- your tower: lit; floors flare as the crawler reads them; the crown glows at rank 1
    const scanY = lerp(8 * 3.4, 0.4, smooth(prog(t, SCAN0, SCAN1)));
    const scanA = win(t, SCAN0 - 0.1, SCAN1 + 0.15, 0.15, 0.2);
    hero.update(t, -10, 1.5, 1 + 0.6 * pk(t, T.rTel + 0.4, 0.5) + 0.5 * pk(t, T.xReh + 0.3, 0.4));
    hero.group.position.set(HERO.x, 0, HERO.z);
    levels.forEach((lvl, f) => {
      lvl.position.x = 0; lvl.position.z = 0; lvl.rotation.set(0, 0, 0);
      const hit = scanA * Math.exp(-Math.pow((f * 3.4 + 1.7 - scanY) / 2.2, 2));
      lvl.children[1].material.emissive.set('#ffffff').lerp(new THREE.Color('#8fd0ff'), clamp(hit));
      lvl.children[1].material.emissiveIntensity *= 1 + 0.8 * hit;
    });
    scan.visible = scanA > 0.002; scanMat.opacity = 0.5 * scanA; scan.position.set(HERO.x, scanY, HERO.z);
    racks.forEach((r) => { r.position.y = 0; r.visible = true; r.rotation.z = 0; });
    leds.visible = true;
    ledPos.forEach((p, k) => {
      const h = hash(k * 7.3), rate = 1.5 + 6 * hash(k * 3.1);
      const on = Math.sin(t * rate + h * 40) > -0.2 ? 1 : 0.15;
      leds.setColorAt(k, (h > 0.7 ? new THREE.Color('#58ff9c').multiplyScalar(1.8) : new THREE.Color('#3f86ff').multiplyScalar(1.6)).multiplyScalar(on));
    });
    leds.instanceColor.needsUpdate = true;
    sliceMat.opacity = 0; sliceEdges.material.opacity = 0;
    portalMat.opacity = 1; portal.visible = true;
    pPostL.position.x = -2.9; pPostR.position.x = 2.9; pBeam.scale.x = 6.02; pBeam.position.y = 3.4;
    door.scale.x = 5.8 / 2.6; door.visible = true;
    doorMat.color.set('#9cc2ff').multiplyScalar(1.25); doorMat.opacity = 0.9;
    doorLeaf.scale.x = 0.001;
    heroGlow.color.set('#9cc2ff'); heroGlow.intensity = 3.5; heroGlow.position.set(HERO.x + 2, 3, DOORZ + 3);
    lock.visible = true; lock.rotation.z = 0; lock.position.copy(LOCKW); lock.scale.setScalar(1);
    shackle.position.y = 0.7;
    lockMetal.color.set('#dfe6f2'); lockMetal.metalness = 0.95; lockMetal.roughness = 0.22;
    lockMetal.emissive.copy(BLUE); lockMetal.emissiveIntensity = 0.25;
    lockRim.material.opacity = 1; lockRim.material.color.copy(BLUE).multiplyScalar(3);
    ghostMat.opacity = 0; ghostLock.visible = false; ringMat.opacity = 0; renew.visible = false;
    gauge.visible = true; gauge.scale.setScalar(1);
    needle.rotation.z = Math.PI / 2 - Math.PI * 0.94;
    gSegs.forEach((m, k) => { m.opacity = k === 2 ? 1 : 0.32; });
    closedMat.opacity = 0; closedBg.material.opacity = 0; closedSign.visible = closedBg.visible = false;
    // last season's map pin stays on the roof; the rivals, the searchers and the reviewers are gone
    rivals.forEach((P) => { P.g.visible = false; P.ringMat.opacity = 0; });
    heroPin.g.visible = true;
    heroPin.g.position.copy(HERO_PIN).add(new THREE.Vector3(0, 0.4 * Math.sin(t * 1.4), 0));
    heroPin.g.rotation.y = 0.35 * Math.sin(t * 0.7); heroPin.g.scale.setScalar(heroPin.scale * (1 + 0.12 * pk(t, T.b0 + 2.3, 0.3)));
    heroPin.mat.opacity = 1; heroPin.dotMat.opacity = 1; heroPin.mat.emissiveIntensity = 0.55 + 0.6 * pk(t, T.b0 + 2.3, 0.3);
    heroPin.ring.position.set(HERO.x, 0.42, HERO.z); heroPin.ring.scale.setScalar(9 * (1 + 0.25 * ((t * 0.6) % 1)));
    heroPin.ringMat.opacity = 0.3 * (1 - ((t * 0.6) % 1));
    searchers.forEach((P) => { P.m.visible = false; });
    reviewers.forEach((P) => { P.m.visible = false; });
    visitor.m.visible = false;
    const streamA = 1 - smooth(prog(t, T.g0, T.g0 + 0.6)) + win(t, T.rIlk - 0.6, T.rEnd + 0.4, 0.5, 0.5) + smooth(prog(t, T.x0 - 0.3, T.x0 + 0.5));
    stream.forEach((P, i) => {
      const D = 6 * t - i * 3 + 30, s = 30 - (D % 30);
      setPerson(P, qPos(Math.max(-0.9, s), P.jit), clamp(streamA) * smooth(clamp((30 - s) / 2.5)) * clamp(1 + s / 0.9), { walk: 1, t });
    });

    // ---- the guide's tower rises; its book opens; the light sweeps the city, then points at three addresses
    const hqLights = 1 + 0.6 * pk(t, T.gRehber + 0.2, 0.5) + 0.5 * pk(t, T.xDef + 0.3, 0.4);
    hq.update(t, BUILD0, 1.5, hqLights);
    hqStripMat.opacity = prog(t, BUILD0 + 1.4, BUILD0 + 1.9) * (0.8 + 0.2 * Math.sin(t * 2));
    hqStrips.forEach((m) => { m.visible = t > BUILD0 + 1.4; });
    const open = outCubic(prog(t, OPEN0, OPEN0 + 0.9));
    book.visible = t > OPEN0 - 0.3;
    pages.forEach(({ hinge, sd }) => { hinge.rotation.z = sd * lerp(Math.PI / 2 * 0.97, 0.16, open); });
    pageMat.opacity = clamp(open * 1.5); coverMat.opacity = clamp(prog(t, OPEN0 - 0.3, OPEN0 + 0.1));
    coverMat.emissiveIntensity = 0.6 + 1.2 * pk(t, T.iEkler + 0.3, 0.4) + 0.8 * pk(t, T.xDef + 0.3, 0.4);
    const searchK = win(t, T.iArama + 0.6, T.iOlmayan + 0.3, 0.4, 0.5);
    bookGlow.material.opacity = open * (0.35 + 0.6 * pk(t, T.iEkler + 0.3, 0.5) + 0.6 * searchK + 0.5 * pk(t, T.kCikan + 0.2, 0.6) + 0.5 * pk(t, T.xDef + 0.3, 0.4));
    bookGlow.quaternion.copy(camera.quaternion);
    rows.forEach((r, k) => {
      const on = prog(t, T.kAdres + 0.3 + k * 0.11, T.kAdres + 0.5 + k * 0.11) * (1 - smooth(prog(t, T.kEnd + 0.1, T.kEnd + 0.6)));
      const landed = k === 0 ? smooth(prog(t, T.iEkler + 0.1, T.iEkler + 0.5)) * (1 - smooth(prog(t, T.iEnd, T.iEnd + 0.5))) : 0;
      rowMats[k].opacity = 0.9 * Math.max(on, landed, 0.6 * searchK * (k < 3 ? 1 : 0.4));
      r.visible = rowMats[k].opacity > 0.002;
    });
    const BOOK_CTR = BOOK_POS.clone();
    const sweep = win(t, T.gHer - 0.3, T.gAdres - 0.1, 0.4, 0.3);
    const ang = (t - T.gHer) * 1.25 + 0.6;
    beams[0].set(BOOK_CTR, new THREE.Vector3(Math.sin(ang) * 46, 0, Math.cos(ang) * 40 - 8), 7, 0.55 * sweep);
    const pointA = win(t, T.gAdres - 0.15, T.gUc + 0.5, 0.35, 0.45);
    const ADDR = [new THREE.Vector3(HERO.x, 0, DOORZ + 2), new THREE.Vector3(XB[1].x, 0, XB[1].z), new THREE.Vector3(XB[2].x, 0, XB[2].z)];
    if (pointA > 0.002) ADDR.forEach((a, k) => beams[k].set(BOOK_CTR, a, 4.2, 0.5 * pointA * clamp((t - T.gAdres + 0.15 - k * 0.15) * 4)));
    else { beams[1].set(BOOK_CTR, ADDR[1], 1, 0); beams[2].set(BOOK_CTR, ADDR[2], 1, 0); }
    if (sweep <= 0.002 && pointA <= 0.002) beams[0].set(BOOK_CTR, ADDR[0], 1, 0);
    // a search arrives: a beam from the sky into the book ("bu deftere bakar")
    if (searchK > 0.002 && pointA <= 0.002 && sweep <= 0.002) beams[0].set(new THREE.Vector3(BOOK_CTR.x, BOOK_CTR.y + 70, BOOK_CTR.z + 20), BOOK_CTR, 2.2, 0.6 * searchK);

    // ---- the site's pages rise beside your tower; /kampanya stays dark
    pavs.forEach((P, k) => {
      const lit = k === 2 ? 0.25 : 1 + 0.8 * pk(t, k === 0 ? P1AT : P2AT, 0.4);
      P.update(t, T.cSayfa - 0.7 + k * 0.25, 0.9, lit);
    });

    // ---- links: the web appears as the crawlers set off; the main route draws itself behind the main crawler
    const webA = win(t, T.cGez - 0.3, T.iArama, 0.4, 0.6) + win(t, T.xGez - 0.4, T.save, 0.4, 0.5);
    webArcs.forEach((A, k) => { const d = prog(t, T.cGez + k * 0.12, T.cGez + 0.9 + k * 0.12); A.set(t > T.x0 ? 1 : d, 0.55 * clamp(webA)); });
    const s = along(t, MAIN);
    const replay = prog(t, T.xGez - 0.2, T.xGez + 1.6);                // the recap runs the route again, quickly
    routeArcs.forEach((A, k) => {
      const d = t > T.x0 ? clamp(replay * 5 - k) : clamp(s - k);
      A.set(d, 0.9 * clamp(webA));
    });
    const mainA = win(t, T.cGez - 0.2, T.iEkler + 0.5, 0.3, 0.4) + win(t, T.xGez - 0.3, T.xGez + 1.9, 0.2, 0.3);
    crawlers[0].set([...routeCurves, backCurve], t > T.x0 ? replay * 5 : s, clamp(mainA));
    // two more crawlers roam other links
    const w1 = [WEB[2], WEB[0]].map(([a, b, h]) => webArcs[WEB.findIndex((x) => x[0] === a && x[1] === b)].curve);
    const w2 = [WEB[5], ROUTE[1]].map(([a, b, h], k) => (k === 0 ? webArcs[5].curve : routeArcs[1].curve));
    crawlers[1].set(w1, 2 * smooth(prog(t, T.cGez + 0.3, T.cHic + 0.4)), win(t, T.cGez + 0.1, T.cHic + 0.8, 0.3, 0.4));
    crawlers[2].set(w2, 2 * smooth(prog(t, T.cGez + 0.6, T.cHic + 1.2)), win(t, T.cGez + 0.4, T.cHic + 1.6, 0.3, 0.4));
    // your card: appears at the crawler, rides into the book, settles on the first row
    const cA = win(t, CARD0, T.iEkler + 0.55, 0.3, 0.35);
    siteCardG.visible = cA > 0.002;
    if (siteCardG.visible) {
      const at = crawlers[0].head.position.clone().add(new THREE.Vector3(0, 2.2, 0));
      const land = smooth(prog(t, T.iEkler - 0.25, T.iEkler + 0.3));
      const ROW0 = rows[0].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.5, 0));
      siteCardG.position.copy(at.lerp(ROW0, land));
      siteCardG.quaternion.copy(camera.quaternion);
      siteCardG.scale.setScalar(lerp(0.4, 1.25, outBack(prog(t, CARD0, CARD0 + 0.45), 1.6)) * lerp(1, 0.55, land));
      siteCard.material.opacity = cA; siteCardBg.material.opacity = 0.9 * cA; siteCardEdge.material.opacity = cA * (0.7 + 0.3 * Math.sin(t * 6));
    }

    // ---- the avenue: the first page; the back street: the second page, dark and empty
    avenueMat.uniforms.uA.value = win(t, T.rIlk - 0.3, T.rEnd + 0.3, 0.4, 0.5) + 0.7 * win(t, T.xReh - 0.2, T.save, 0.3, 0.5);
    avenueMat.uniforms.uT.value = t;
    avenue.visible = avenueMat.uniforms.uA.value > 0.002;
    backMat.opacity = 0.88 * win(t, T.rIkinci - 0.3, T.rEnd + 0.3, 0.4, 0.5);
    backSt.visible = backMat.opacity > 0.002;
  }

  function render() { composer.render(); }

  const project = (v) => { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * W, y: (-tmpV.y * 0.5 + 0.5) * H, z: tmpV.z, behind: tmpV.z > 1 }; };

  const pinTop = (P, up = 1.4) => P.g.position.clone().add(new THREE.Vector3(0, 3.2 * P.g.scale.y + up, 0));
  const up = (v, h) => v.clone().add(new THREE.Vector3(0, h, 0));
  const anchors = {
    sign: new THREE.Vector3(SIGN_A.x, 5.4, SIGN_A.z), heroTop: new THREE.Vector3(HERO.x, 8 * 3.4 + 2.5, HERO.z),
    door: new THREE.Vector3(HERO.x, 4.2, HERO.z + 6.3), lock: () => lock.position.clone().setY(2.9),
    mailbox: MBOX.clone().setY(3.4), gauge: new THREE.Vector3(HERO.x, 7.4, DOORZ + 0.5), safe: SAFE1.clone().setY(3.6),
    route: new THREE.Vector3(-20, 1, 14), heroPin: () => pinTop(heroPin),
    hqTop: up(BOOK_POS, 7), book: BOOK_POS.clone(), hqMid: new THREE.Vector3(HQ.x, 30, HQ.z + 5.5),
    pav: (k) => up(pavs[k].top, 1.4), crawler: () => crawlers[0].head.position.clone(), card: () => siteCardG.position.clone(),
    ave: (k) => (AVE[k].hero ? pinTop(heroPin, 1.2) : up(AVE[k].p, 1.6)), back: (k) => up(BACK[k], 1.6),
    addr: (k) => (k === 0 ? new THREE.Vector3(HERO.x, 2.5, DOORZ + 2) : up(XB[k], 1.2)), xb: (k) => up(XB[k], 1.2),
  };
  return { renderer, scene, camera, update, render, project, anchors, routes: { route1 }, canvas, GATE, HERO, score, ave: { n: AVE.length, hero: AVE.findIndex((a) => a.hero) }, backN: BACK.length };
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

// ------------------------------------------------------------------ season 2 textures
function bookPageTexture() {
  // an open spread: lines of entries on both pages, a faint header, the gutter shadow in the middle
  const c = document.createElement('canvas'); c.width = 1024; c.height = 768;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1024, 0);
  grd.addColorStop(0, '#16284a'); grd.addColorStop(0.47, '#0d1a33'); grd.addColorStop(0.5, '#060c18'); grd.addColorStop(0.53, '#0d1a33'); grd.addColorStop(1, '#16284a');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 768);
  g.strokeStyle = 'rgba(120,170,255,0.55)'; g.lineWidth = 4; g.strokeRect(10, 10, 1004, 748);
  for (const x0 of [40, 552]) {
    g.fillStyle = 'rgba(150,190,255,0.85)'; g.fillRect(x0, 46, 180, 18);
    for (let k = 0; k < 12; k++) {
      const y = 100 + k * 54;
      g.fillStyle = 'rgba(110,160,255,0.55)'; g.fillRect(x0, y, 26, 18);
      g.fillStyle = 'rgba(180,205,255,0.42)'; g.fillRect(x0 + 40, y, 140 + ((k * 37 + x0) % 170), 14);
      g.fillStyle = 'rgba(180,205,255,0.22)'; g.fillRect(x0 + 40, y + 22, 90 + ((k * 53 + x0) % 210), 10);
    }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
