// Act 3 — torch to lamp, the office, the wink, the brand.
import { W, H, clamp, lerp, inv, sstep, easeIO, easeOut, easeIn, win, lerp3, TAU, mulberry32, hex, rgb, mix, Cam, figure, glow, softDisc, beam, scratch, fillPoly, projectPoly, pathPoly } from './engine.js';
import { MAN, CUSTOMERS, WALK, gait, manFront, manSeated, personFront, personSide, faceFront, hatFront, hatProfile, tr } from './characters.js';
import { renderWorld } from './world.js';
import { actorT } from './common.js';
import { MAN_STOP, LINE } from './act2.js';

const cam = new Cam();
const TORCH = hex('#fff0d8');
const WARM = hex('#ffb866');
const BLUE = hex('#1c73fd');

// ---------------------------------------------------------------- S19: he looks into one torch — it swallows the frame
function S19(ctx, t) {
  const lt = t - 60.6;
  if (lt < 1.25) {
    // close on his face as he turns toward the light (C1 raises her torch)
    cam.set([19.4, 1.62, -57.9], [19.25, 1.58, -59.2], 30);
    const turn = easeIO(inv(0.1, 0.8, lt)), light = sstep(0.3, 1.2, lt);
    const actors = [{ pos: MAN_STOP, draw: (c) => {
      const T = actorT(cam, MAN_STOP);
      figure(c, (g) => manFront(g, T, { head: { yaw: -turn * 0.35, gazeX: -turn * 0.9, brow: 0.6, squint: light * 0.4 }, lightSide: -1 }), {
        spots: [{ x: T.ox - T.s * 0.25, y: T.oy - T.s * 1.62, r: T.s * (0.3 + light * 0.4), color: [255, 236, 205], a: 0.25 + light * 0.35 }],
        rims: [{ dir: [-1, -0.2], color: TORCH, a: 0.4 + light * 0.4, w: 10 }],
      });
    } }];
    renderWorld(ctx, cam, { actors, lampGain: 0.6 });
    return;
  }
  // POV: the torch lens, centred, opening up until the frame is white
  const u = inv(1.25, 2.3, lt);
  ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.47;
  const r = lerp(70, 1300, easeIn(u));
  // hand and torch body (silhouette), receding as the light blooms
  ctx.save(); ctx.globalAlpha = 1 - sstep(0.2, 0.6, u);
  ctx.fillStyle = '#121316'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.35, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0c0d0f'; ctx.beginPath(); ctx.roundRect(cx - 190, cy + r * 1.1, 380, 520, 120); ctx.fill();
  ctx.restore();
  // reflector rings
  for (let k = 3; k >= 1; k--) glow(ctx, cx, cy, r * (1 + k * 0.28), TORCH, 0.18 + 0.1 * (3 - k));
  ctx.save(); ctx.fillStyle = rgb(TORCH); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.restore();
  glow(ctx, cx, cy, r * 2.4, TORCH, 0.6);
  const white = sstep(0.55, 1.0, u);
  if (white > 0) { ctx.fillStyle = `rgba(255,246,232,${white})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- the office (warm early evening)
// Room coordinates (metres): back wall z=-4, left wall x=-2.6, right wall x=2.8, floor y=0. He sits at z=-2.6.
const O = {
  stone: hex('#6d665d'), stoneDark: hex('#4a453f'), wood: hex('#3a2a1f'), woodLight: hex('#5a4231'), floor: hex('#2a211b'),
  charcoal: hex('#26272b'), desk: hex('#35271e'), deskTop: hex('#4a3629'), leather: hex('#1f1a17'), brass: hex('#a07a45'),
};
let CITY = null;
function paintCity() {
  const c = document.createElement('canvas'); c.width = 900; c.height = 700;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 700);
  sky.addColorStop(0, '#1d2940'); sky.addColorStop(0.45, '#3b4a66'); sky.addColorStop(0.75, '#b0765a'); sky.addColorStop(1, '#d99a64');
  g.fillStyle = sky; g.fillRect(0, 0, 900, 700);
  const r = mulberry32(42);
  // far towers
  g.fillStyle = 'rgba(40,46,62,0.7)';
  for (let i = 0; i < 9; i++) { const x = r() * 900, w = 40 + r() * 70, h = 180 + r() * 200; g.fillRect(x, 700 - h - 120, w, h + 120); }
  // the neighbourhood: stone rooftops, chimneys, lit windows, the same lanterns
  for (let row = 0; row < 2; row++) {
    let x = -20;
    while (x < 920) {
      const w = 90 + r() * 110, h = (row ? 250 : 170) + r() * 90;
      const y = 700 - h;
      g.fillStyle = row ? '#23252d' : '#2e2f37'; g.fillRect(x, y, w, h);
      g.fillStyle = row ? '#1a1b21' : '#24252c'; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + w * 0.5, y - 40 - r() * 20); g.lineTo(x + w + 6, y); g.fill();
      if (r() < 0.6) g.fillRect(x + w * (0.2 + r() * 0.5), y - 60, 14, 40);
      for (let wy = y + 30; wy < 690; wy += 46) for (let wx = x + 14; wx < x + w - 20; wx += 30) if (r() < 0.28) { g.fillStyle = r() < 0.8 ? '#f0b261' : '#e8c79a'; g.fillRect(wx, wy, 12, 18); }
      x += w + 4;
    }
  }
  for (let i = 0; i < 7; i++) { const x = 40 + i * 130 + r() * 30, y = 560 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, 26); gr.addColorStop(0, 'rgba(255,200,130,0.9)'); gr.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = gr; g.fillRect(x - 26, y - 26, 52, 52); }
  return c;
}
const Q = (x0, x1, y0, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
function mapImage(ctx, cam, img, corners) { // affine map of an image onto a (near-frontal) quad
  const p0 = cam.project(corners[3]), p1 = cam.project(corners[2]), p3 = cam.project(corners[0]);
  if (p0[2] <= 0 || p1[2] <= 0 || p3[2] <= 0) return;
  ctx.save(); ctx.setTransform((p1[0] - p0[0]) / img.width, (p1[1] - p0[1]) / img.width, (p3[0] - p0[0]) / img.height, (p3[1] - p0[1]) / img.height, p0[0], p0[1]);
  ctx.drawImage(img, 0, 0); ctx.restore();
}

function drawOffice(ctx, cam, t, opts = {}) {
  const f = (pts, c) => fillPoly(ctx, cam, pts, rgb(c));
  // back wall (stone) with the window and the glass partition
  f(Q(-2.6, 2.8, 0, 3.2, -4), O.stone);
  ctx.save(); const sp = projectPoly(cam, Q(-2.6, 2.8, 0, 3.2, -4)); if (sp.length > 2) { pathPoly(ctx, sp); ctx.clip();
    for (let y = 0.4; y < 3.2; y += 0.4) { const a = cam.project([-2.6, y, -3.999]), b = cam.project([2.8, y, -3.999]); ctx.strokeStyle = 'rgba(30,26,22,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  } ctx.restore();
  // window onto the neighbourhood
  f(Q(-2.3, -0.15, 0.8, 2.75, -3.99), O.charcoal);
  mapImage(ctx, cam, CITY, Q(-2.22, -0.23, 0.88, 2.67, -3.985));
  for (const x of [-1.22]) f(Q(x - 0.03, x + 0.03, 0.88, 2.67, -3.98), O.charcoal);
  f(Q(-2.22, -0.23, 1.9, 1.95, -3.98), O.charcoal);
  // glass partition to the corridor (right) — the corridor is lit warmly behind it
  f(Q(0.12, 2.0, 0.0, 2.75, -3.99), hex('#1d1a17'));
  f(Q(0.17, 1.95, 0.05, 2.7, -3.985), hex('#8c7864'));
  const cg = cam.project([1.1, 2.2, -4.6]); glow(ctx, cg[0], cg[1], cam.scaleAt([1.7, 2, -4.6]) * 1.6, WARM, 0.35);
  if (opts.corridor) opts.corridor(ctx);
  ctx.save(); const gp = projectPoly(cam, Q(0.17, 1.95, 0.05, 2.7, -3.98)); if (gp.length > 2) { pathPoly(ctx, gp); ctx.fillStyle = 'rgba(30,40,52,0.28)'; ctx.fill(); } ctx.restore();
  for (const x of [1.06]) f(Q(x - 0.025, x + 0.025, 0.05, 2.7, -3.975), O.charcoal);
  // side walls: stone left, dark wood right with shelves
  f([[-2.6, 0, 3], [-2.6, 0, -4], [-2.6, 3.2, -4], [-2.6, 3.2, 3]], O.stoneDark);
  f([[2.8, 0, -4], [2.8, 0, 3], [2.8, 3.2, 3], [2.8, 3.2, -4]], O.wood);
  for (const y of [1.0, 1.45, 1.9]) {
    f([[2.79, y, -3.6], [2.79, y, -2.2], [2.5, y, -2.2], [2.5, y, -3.6]], O.woodLight);
    const r = mulberry32(Math.round(y * 10));
    let z = -3.55;
    while (z < -2.3) { const w = 0.03 + r() * 0.03, h = 0.22 + r() * 0.12; const col = y === 1.45 && z > -3.0 && z < -2.9 ? BLUE : [hex('#6b5a45'), hex('#40372f'), hex('#8a7a62'), hex('#2f3033')][Math.floor(r() * 4)]; f([[2.78, y, z], [2.78, y, z + w], [2.78, y + h, z + w], [2.78, y + h, z]], y === 1.45 && z > -3.0 && z < -2.9 ? mix(BLUE, hex('#2a2f3a'), 0.35) : col); z += w + 0.005; }
  }
  // floor
  f([[-2.6, 0, 3], [2.8, 0, 3], [2.8, 0, -4], [-2.6, 0, -4]], O.floor);
  // warm pool of the globe lamp on the back wall
  const lp = cam.project([0.62, 1.4, -3.99]); glow(ctx, lp[0], lp[1], cam.scaleAt([0.62, 1.4, -4]) * 1.4, WARM, 0.28);
  // chair back + his trench coat draped over it (same coat), then him
  { // leather chair back (rounded), with his trench coat draped over the left side
    const cc = cam.project([0.05, 1.06, -2.95]), s0 = cam.scaleAt([0.05, 1.06, -2.95]);
    if (cc[2] > 0) {
      ctx.save();
      ctx.fillStyle = rgb(O.leather); ctx.beginPath(); ctx.roundRect(cc[0] - s0 * 0.29, cc[1] - s0 * 0.36, s0 * 0.58, s0 * 0.66, [s0 * 0.16, s0 * 0.16, s0 * 0.04, s0 * 0.04]); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,160,0.08)'; ctx.beginPath(); ctx.roundRect(cc[0] + s0 * 0.12, cc[1] - s0 * 0.33, s0 * 0.12, s0 * 0.6, s0 * 0.06); ctx.fill();
      const tx = cc[0] - s0 * 0.26, ty = cc[1] - s0 * 0.33;
      ctx.fillStyle = MAN.coat; ctx.beginPath(); ctx.moveTo(tx - s0 * 0.02, ty);
      ctx.quadraticCurveTo(tx - s0 * 0.14, ty + s0 * 0.25, tx - s0 * 0.12, ty + s0 * 0.75); ctx.lineTo(tx + s0 * 0.1, ty + s0 * 0.78);
      ctx.quadraticCurveTo(tx + s0 * 0.1, ty + s0 * 0.3, tx + s0 * 0.14, ty + s0 * 0.02); ctx.closePath(); ctx.fill();
      ctx.fillStyle = MAN.coatShade; ctx.beginPath(); ctx.moveTo(tx - s0 * 0.02, ty); ctx.quadraticCurveTo(tx - s0 * 0.12, ty + s0 * 0.3, tx - s0 * 0.1, ty + s0 * 0.74); ctx.lineTo(tx - s0 * 0.04, ty + s0 * 0.75); ctx.quadraticCurveTo(tx - s0 * 0.05, ty + s0 * 0.3, tx + s0 * 0.02, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = MAN.belt; ctx.fillRect(tx - s0 * 0.1, ty + s0 * 0.42, s0 * 0.2, s0 * 0.035);
      ctx.restore();
    }
  }
  { // chair column and star base (visible between his legs)
    const b = cam.project([0.05, 0.08, -2.75]), cTop = cam.project([0.05, 0.44, -2.75]), s1 = cam.scaleAt([0.05, 0.1, -2.75]);
    if (b[2] > 0) {
      ctx.save(); ctx.fillStyle = '#141416';
      ctx.fillRect(b[0] - s1 * 0.025, cTop[1], s1 * 0.05, b[1] - cTop[1]);
      for (const a of [-2.6, -1.2, 0, 1.2, 2.6]) { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + Math.sin(a) * s1 * 0.34, b[1] + Math.cos(a) * s1 * 0.07 + s1 * 0.03); ctx.lineWidth = s1 * 0.03; ctx.strokeStyle = '#141416'; ctx.stroke(); ctx.beginPath(); ctx.arc(b[0] + Math.sin(a) * s1 * 0.34, b[1] + Math.cos(a) * s1 * 0.07 + s1 * 0.05, s1 * 0.025, 0, TAU); ctx.fill(); }
      ctx.fillStyle = rgb(O.leather); ctx.beginPath(); ctx.roundRect(cTop[0] - s1 * 0.27, cTop[1] - s1 * 0.06, s1 * 0.54, s1 * 0.08, s1 * 0.03); ctx.fill();
      ctx.restore();
    }
  }
  if (opts.man) opts.man(ctx);
  // desk: slab top on slim legs + a drawer pedestal on the right, so his legs stay visible underneath
  f([[-0.95, 0.0, -1.42], [-0.91, 0.0, -1.42], [-0.91, 0.72, -1.42], [-0.95, 0.72, -1.42]], O.charcoal);
  f([[0.46, 0.0, -1.4], [0.95, 0.0, -1.4], [0.95, 0.72, -1.4], [0.46, 0.72, -1.4]], O.desk);
  for (const y of [0.24, 0.48]) f([[0.48, y, -1.395], [0.93, y, -1.395], [0.93, y + 0.012, -1.395], [0.48, y + 0.012, -1.395]], hex('#241a14'));
  f([[-0.97, 0.72, -2.25], [0.97, 0.72, -2.25], [0.97, 0.765, -1.33], [-0.97, 0.765, -1.33]], O.deskTop);
  f([[-0.97, 0.72, -1.33], [0.97, 0.72, -1.33], [0.97, 0.765, -1.33], [-0.97, 0.765, -1.33]], mix(O.deskTop, hex('#c9a27a'), 0.2));
  // keyboard under his hands
  f([[-0.2, 0.768, -2.16], [0.24, 0.768, -2.16], [0.24, 0.768, -2.0], [-0.2, 0.768, -2.0]], hex('#1d1e22'));
  if (opts.arms) opts.arms(ctx);
  // monitor (seen from behind-left, screen facing him), soft screen glow
  const mc = [-0.5, 1.08, -1.95];
  f([[-0.8, 0.9, -1.72], [-0.2, 0.9, -2.12], [-0.2, 1.27, -2.12], [-0.8, 1.27, -1.72]], hex('#17181b'));
  f([[-0.53, 0.76, -1.9], [-0.47, 0.76, -1.94], [-0.47, 0.92, -1.94], [-0.53, 0.92, -1.9]], hex('#202125'));
  const ms = cam.project([-0.42, 1.1, -2.05]); glow(ctx, ms[0], ms[1], cam.scaleAt(mc) * 0.7, hex('#cfe0ff'), 0.12 + (opts.ping || 0) * 0.25);
  // hat on the desk (same fedora)
  const hp = cam.project([-0.72, 0.76, -1.6]);
  if (hp[2] > 0) { const s = cam.scaleAt([-0.72, 0.76, -1.6]); hatProfile(ctx, { ox: hp[0], oy: hp[1], s, dir: -1 }, [0, -0.045], MAN); }
  // the globe lamp (brass stand, opal glass) — the match-cut circle
  const gc = [0.62, 1.12, -1.65];
  f([[0.55, 0.76, -1.65], [0.69, 0.76, -1.65], [0.69, 0.79, -1.65], [0.55, 0.79, -1.65]], O.brass);
  f([[0.61, 0.79, -1.65], [0.63, 0.79, -1.65], [0.63, 1.0, -1.65], [0.61, 1.0, -1.65]], O.brass);
  const g0 = cam.project(gc), gs = cam.scaleAt(gc);
  if (g0[2] > 0) {
    glow(ctx, g0[0], g0[1], gs * 0.9, WARM, 0.5);
    ctx.save(); const gr = ctx.createRadialGradient(g0[0] - gs * 0.03, g0[1] - gs * 0.03, 0, g0[0], g0[1], gs * 0.13);
    gr.addColorStop(0, '#fff6e6'); gr.addColorStop(0.7, '#ffe0b0'); gr.addColorStop(1, '#f2b777');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g0[0], g0[1], gs * 0.13, 0, TAU); ctx.fill(); ctx.restore();
    glow(ctx, g0[0], g0[1], gs * 0.35, hex('#ffe7c2'), 0.45);
  }
  // a subtle Fentra-blue detail: the notebook on the desk
  f([[0.1, 0.761, -1.55], [0.38, 0.761, -1.55], [0.38, 0.761, -1.85], [0.1, 0.761, -1.85]], mix(BLUE, hex('#1f2430'), 0.62));
  // warm evening haze
  const hz = ctx.createLinearGradient(0, 0, 0, H); hz.addColorStop(0, 'rgba(20,16,12,0.25)'); hz.addColorStop(1, 'rgba(10,8,6,0.35)');
  ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
}
const SEAT = [0.05, 0, -2.6];
function drawSeated(ctx, cam, pose, part) {
  const T = actorT(cam, SEAT);
  const kb = cam.project([0.02, 0.775, -2.08]);
  const handsY = (T.oy - kb[1]) / T.s;
  figure(ctx, (g) => manSeated(g, T, { ...pose, part, handsY }), {
    rims: [{ dir: [1, -0.3], color: WARM, a: 0.45, w: T.s * 0.01 }, { dir: [-1, 0], color: hex('#bcd2ff'), a: 0.25 + (pose.ping || 0) * 0.25, w: T.s * 0.008 }],
    spots: [{ x: T.ox - T.s * 0.3, y: T.oy - T.s * 1.35, r: T.s * 0.45, color: [200, 220, 255], a: 0.12 + (pose.ping || 0) * 0.14 }, { x: T.ox + T.s * 0.4, y: T.oy - T.s * 1.25, r: T.s * 0.6, color: [255, 200, 140], a: 0.18 }],
  });
}
const seated = (cam, pose) => ({ man: (c) => drawSeated(c, cam, pose), arms: (c) => drawSeated(c, cam, pose, 'arms') });

// ---------------------------------------------------------------- S20: match cut — the torch becomes the globe lamp; pull back into the office
function S20(ctx, t) {
  const lt = t - 63.4;
  const u = easeIO(inv(0.2, 4.6, lt));
  const pos = lerp3([0.62, 1.12, -1.36], [-0.22, 1.3, 0.45], u);
  const tgt = lerp3([0.62, 1.12, -1.65], [0.0, 1.08, -2.6], sstep(0.15, 0.85, u));
  cam.set(pos, tgt, lerp(40, 38, u));
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  drawOffice(ctx, cam, t, seated(cam, { expr: { yaw: -0.3, gazeX: -0.7, brow: 0.1, smile: 0.05 }, lightSide: 1 }));
  const white = 1 - sstep(0.0, 0.7, lt);
  if (white > 0) { ctx.fillStyle = `rgba(255,246,232,${white})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- S21: the screen — enquiries arriving
function card(ctx, x, y, w, title, sub, a, slide) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - slide) * 60, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  const h = sub ? 176 : 132;
  ctx.fillStyle = '#f3f1ec'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = rgb(BLUE); ctx.beginPath(); ctx.roundRect(x, y, 8, h, [26, 0, 0, 26]); ctx.fill();
  // icon: speech bubble in a blue circle
  const ix = x + 70, iy = y + h / 2;
  ctx.fillStyle = rgb(BLUE); ctx.beginPath(); ctx.arc(ix, iy, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(ix - 14, iy - 11, 28, 19, 5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(ix - 6, iy + 7); ctx.lineTo(ix - 10, iy + 15); ctx.lineTo(ix + 1, iy + 7); ctx.fill();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#17191d'; ctx.font = '600 36px "Manrope"';
  ctx.fillText(title, x + 124, sub ? y + 76 : y + h / 2 + 13);
  if (sub) { ctx.fillStyle = '#6a6d73'; ctx.font = '400 27px "Manrope"'; ctx.fillText(sub, x + 124, y + 124); }
  ctx.fillStyle = rgb(BLUE); ctx.beginPath(); ctx.arc(x + w - 36, y + 38, 7, 0, TAU); ctx.fill();
  ctx.restore();
}
function screenUI(ctx, t, lt) {
  // the right-hand column of his dashboard, filling the vertical frame (a close insert on the monitor)
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16181c'); bg.addColorStop(1, '#101114');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // bezel edge (left) and a hint of the rest of the screen
  ctx.fillStyle = '#0a0a0b'; ctx.fillRect(0, 0, 46, H);
  ctx.fillStyle = '#1b1d22'; ctx.fillRect(46, 0, 250, H);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i === 1 ? rgb(mix(BLUE, hex('#1b1d22'), 0.3)) : '#2a2d33'; ctx.beginPath(); ctx.roundRect(110, 260 + i * 120, 120, 16, 8); ctx.fill(); ctx.beginPath(); ctx.arc(86, 268 + i * 120, 12, 0, TAU); ctx.fill(); }
  // quiet chart panel (no labels)
  ctx.fillStyle = '#1c1e23'; ctx.beginPath(); ctx.roundRect(340, 150, 680, 420, 28); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(380, 150 + i * 100); ctx.lineTo(980, 150 + i * 100); ctx.stroke(); }
  const grow = sstep(0.2, 2.5, lt);
  ctx.strokeStyle = rgb(BLUE); ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
  const pts = [[380, 500], [470, 480], [560, 470], [650, 430], [740, 420], [830, 360], [920, 320], [980, lerp(300, 250, grow)]];
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  ctx.fillStyle = rgb(BLUE); ctx.beginPath(); ctx.arc(980, lerp(300, 250, grow), 9, 0, TAU); ctx.fill();
  // notifications
  const c1 = sstep(0.55, 0.95, lt), c2 = sstep(2.65, 3.05, lt), c3 = sstep(5.25, 5.65, lt);
  const push = easeOut(c2) * 210 + easeOut(c3) * 170;
  card(ctx, 340, 660 + push, 680, 'Yeni müşteri talebi', 'Web sitesi üzerinden yeni iletişim', c1, easeOut(c1));
  card(ctx, 340, 660 + easeOut(c3) * 170, 680, 'Yeni görüşme talebi', null, c2, easeOut(c2));
  card(ctx, 340, 660, 680, 'Yeni teklif isteği', null, c3, easeOut(c3));
  // older, quiet rows below
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#1c1e23'; ctx.beginPath(); ctx.roundRect(340, 1300 + i * 150 + push * 0.3, 680, 120, 22); ctx.fill(); ctx.fillStyle = '#2b2e35'; ctx.beginPath(); ctx.roundRect(400, 1345 + i * 150 + push * 0.3, 300, 14, 7); ctx.fill(); ctx.beginPath(); ctx.roundRect(400, 1375 + i * 150 + push * 0.3, 200, 10, 5); ctx.fill(); }
  // screen sheen + faint reflection of the room
  const sh = ctx.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,220,180,0.05)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,200,140,0.04)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
}
function S21(ctx, t) {
  const lt = t - 68.2;
  ctx.save();
  const k = 1.04 - 0.03 * easeIO(lt / 6.4);
  ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.rotate(-0.012); ctx.translate(-W / 2, -H / 2);
  screenUI(ctx, t, lt);
  ctx.restore();
}

// ---------------------------------------------------------------- S22: his reaction; a familiar customer passes calmly behind the glass
function S22(ctx, t) {
  const lt = t - 74.6;
  cam.set(lerp3([-0.3, 1.3, 0.35], [-0.26, 1.28, 0.1], easeIO(lt / 5.6)), [0.2, 1.2, -2.6], 42);
  const smile = sstep(0.7, 1.6, lt), lean = easeIO(inv(2.0, 3.2, lt));
  const ping = win(lt, 0.0, 0.1, 0.4, 1.0);
  const walker = (c) => {
    const wt = lt - 1.8; if (wt < 0 || wt > 3.4) return;
    const pose = gait(wt, WALK);
    const p0 = [2.3 - WALK.v * wt * 0.8, 0, -4.7];
    const T0 = actorT(cam, p0, -1);
    const T = { ...T0, ox: T0.ox + pose.hip[0] * T0.s };
    c.save(); const gp = projectPoly(cam, Q(0.17, 1.95, 0.05, 2.7, -3.985)); pathPoly(c, gp); c.clip();
    figure(c, (g) => personSide(g, T, pose, CUSTOMERS[0], { props: true }), { alpha: 0.85, rims: [{ dir: [0, -1], color: WARM, a: 0.4, w: 3 }], blur: 1.5 });
    c.restore();
  };
  drawOffice(ctx, cam, t, { ping, corridor: walker, ...seated(cam, { lean, ping, expr: { yaw: lerp(-0.3, -0.22, lean), gazeX: -0.7, brow: 0.2 + smile * 0.2, smile: smile * 0.55, eyeL: 1 - smile * 0.12, eyeR: 1 - smile * 0.12 }, lightSide: 1 }) });
}

// ---------------------------------------------------------------- S23: he turns to us — one small wink
function S23(ctx, t) {
  const lt = t - 80.2;
  cam.set(lerp3([-0.12, 1.36, -1.05], [-0.1, 1.37, -1.2], easeIO(lt / 4.8)), [0.05, 1.33, -2.6], 26);
  const turn = easeIO(inv(0.15, 1.0, lt));
  const wink = win(lt, 3.3, 3.42, 3.62, 3.78);
  const expr = { yaw: lerp(-0.22, 0.0, turn), gazeX: lerp(-0.7, 0, turn), brow: 0.3 - wink * 0.2, browR: -wink * 0.5, smile: 0.55 + wink * 0.15, smirk: wink * 0.6, eyeL: 0.9, eyeR: 0.9 * (1 - wink) };
  drawOffice(ctx, cam, t, seated(cam, { lean: 1, expr, lightSide: 1 }));
  // end transition begins: the room settles into darkness around the lamp
  const d = sstep(4.2, 4.8, lt);
  if (d > 0) { ctx.fillStyle = `rgba(14,14,16,${d})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- S24: brand
function S24(ctx, t) {
  const lt = t - 85.0;
  const bg = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.46, H * 0.75);
  bg.addColorStop(0, '#1c1c1f'); bg.addColorStop(0.55, '#141416'); bg.addColorStop(1, '#0b0b0c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // the lamp's warm circle lingers, then dissolves (graphic echo of the torch/globe)
  const ring = 1 - sstep(0.0, 1.1, lt);
  if (ring > 0) glow(ctx, W / 2, H * 0.4, 520, WARM, 0.25 * ring);
  const logo = window.FENTRA_LOGO;
  const la = sstep(0.8, 1.6, lt);
  if (logo && la > 0) {
    const w = 540, h = w * logo.height / logo.width;
    ctx.save(); ctx.globalAlpha = la; ctx.filter = la < 0.99 ? `blur(${((1 - la) * 6).toFixed(2)}px)` : 'none';
    ctx.drawImage(logo, W / 2 - w / 2, 690 - h / 2 + (1 - easeOut(la)) * 10, w, h); ctx.restore();
  }
  const hl = easeOut(inv(1.4, 2.1, lt));
  if (hl > 0) { ctx.fillStyle = rgb(BLUE); ctx.fillRect(W / 2 - 60 * hl, 872, 120 * hl, 3); }
  const fade = (a0) => sstep(a0, a0 + 0.7, lt);
  const txt = (s, y, font, col, a0, spacing = 0) => {
    const a = fade(a0); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (spacing) ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(s, W / 2 + spacing / 2, y + (1 - easeOut(a)) * 10); ctx.restore();
  };
  txt('WEB  ·  SEO  ·  GEO', 930, '600 24px "Manrope"', '#b9b1a6', 1.7, 10);
  { // "Dijitalde görünür olun." — the key word set in italic Fentra blue
    const a = fade(2.35);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const y = 1045 + (1 - easeOut(a)) * 10;
      const p1 = 'Dijitalde ', p2 = 'görünür', p3 = ' olun.';
      ctx.font = '500 66px "Playfair Display"'; const w1 = ctx.measureText(p1).width, w3 = ctx.measureText(p3).width;
      ctx.font = 'italic 500 66px "Playfair Display"'; const w2 = ctx.measureText(p2).width;
      let x = W / 2 - (w1 + w2 + w3) / 2;
      ctx.font = '500 66px "Playfair Display"'; ctx.fillStyle = '#f1ebe2'; ctx.fillText(p1, x, y); x += w1;
      ctx.font = 'italic 500 66px "Playfair Display"'; ctx.fillStyle = '#4d8dff'; ctx.fillText(p2, x, y); x += w2;
      ctx.font = '500 66px "Playfair Display"'; ctx.fillStyle = '#f1ebe2'; ctx.fillText(p3, x, y);
      ctx.restore();
    }
  }
  txt('Birlikte başlayalım.', 1150, 'italic 400 42px "Playfair Display"', '#b3aca1', 3.2);
  txt('Birlikte büyüyelim.', 1208, 'italic 400 42px "Playfair Display"', '#b3aca1', 3.5);
  txt('@fentra.digital', 1420, '500 26px "Manrope"', '#8d877f', 4.1, 5);
}

export const ACT3 = [
  { t0: 60.6, t1: 63.4, f: S19 },
  { t0: 63.4, t1: 68.2, f: S20 },
  { t0: 68.2, t1: 74.6, f: S21 },
  { t0: 74.6, t1: 80.2, f: S22 },
  { t0: 80.2, t1: 85.0, f: S23 },
  { t0: 85.0, t1: 93.0, f: S24, noPost: false },
];
export function initAct3() { CITY = paintCity(); }
Object.assign(window.EXTRA_CUES || (window.EXTRA_CUES = {}), { notify: [68.2 + 0.6, 68.2 + 2.7, 68.2 + 5.3], wink: 80.2 + 3.35, flash: 60.6 + 1.3, office: 63.4, brand: 85.0 });
