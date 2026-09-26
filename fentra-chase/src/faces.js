// Faces, hats, hair, palettes and props (unchanged designs; bodies live in rig.js).
import { clamp, lerp, sstep, easeIO, TAU, capsule, poly2, smoothShape } from './engine.js';

export const MAN = {
  skin: '#c69a7c', skinShade: '#94694f', lip: '#9c6a58', hair: '#2b221d', eye: '#17120f',
  coat: '#74644f', coatShade: '#5a4c3c', coatDeep: '#43392d', coatLight: '#8a7860', belt: '#3f352a', button: '#2b241d',
  hat: '#1d1d21', hatBand: '#34333a', hatShade: '#121215',
  suit: '#2d3036', suitShade: '#1f2126', shirt: '#d8d2c6', tie: '#2c3342',
  trousers: '#24272d', trousersShade: '#181a1f', shoe: '#2c1d16', shoeHi: '#6b4a38',
};
export const CUSTOMERS = [
  { id: 'lamp', skin: '#d4a98d', skinShade: '#a47a60', hair: '#4a2c22', style: 'bob', top: '#5f5b3a', topShade: '#48452b', bottom: '#2a2a2d', shoe: '#1f1b18', h: 1.66, w: 0.95, prop: 'lamp', lip: '#a4695c' },
  { id: 'plan', skin: '#b8876a', skinShade: '#8b6048', hair: '#3a3836', style: 'short', glasses: true, top: '#2d394d', topShade: '#222b3a', bottom: '#2a2a2e', shoe: '#18181a', h: 1.86, w: 1.05, prop: 'plan', lip: '#8f5e4c' },
  { id: 'phone', skin: '#8d5e45', skinShade: '#684230', hair: '#1f1815', style: 'ponytail', top: '#5b2c32', topShade: '#442126', bottom: '#232326', shoe: '#1b1b1d', h: 1.64, w: 0.93, prop: 'phone', lip: '#6e3f33' },
  { id: 'box', skin: '#c9a086', skinShade: '#9b755e', hair: '#8b8680', style: 'cap', beard: true, top: '#5f5b56', topShade: '#4a4642', bottom: '#4a3b2f', shoe: '#231b15', h: 1.74, w: 1.02, prop: 'box', lip: '#9a6a5a' },
  { id: 'folder', skin: '#a4735a', skinShade: '#7b523e', hair: '#2d221d', style: 'bun', top: '#2e473d', topShade: '#22352e', bottom: '#262626', shoe: '#1a1a1a', h: 1.70, w: 0.97, prop: 'folder', lip: '#84503f' },
];

export const tr = (T, x, y) => [T.ox + T.dir * T.s * x, T.oy - T.s * y];
export const P = (T, pts) => pts.map((p) => tr(T, p[0], p[1]));
// A closed hand (fist / grip): palm block, curled finger line, thumb. p = screen centre, ang = screen angle of the forearm.
export function fist(g, p, s, ang, skin, shade, thumbSide = 1) {
  g.save(); g.translate(p[0], p[1]); g.rotate(ang);
  g.fillStyle = skin; g.beginPath(); g.roundRect(-s * 0.036, -s * 0.042, s * 0.072, s * 0.09, s * 0.024); g.fill();
  g.fillStyle = shade; g.beginPath(); g.roundRect(-s * 0.036, s * 0.02, s * 0.072, s * 0.028, s * 0.014); g.fill();
  g.strokeStyle = shade; g.lineWidth = Math.max(0.8, s * 0.004); g.lineCap = 'round';
  for (const x of [-0.012, 0.006, 0.022]) { g.beginPath(); g.moveTo(s * x, s * 0.022); g.lineTo(s * x, s * 0.04); g.stroke(); }
  g.fillStyle = shade; g.beginPath(); g.ellipse(thumbSide * s * 0.03, -s * 0.005, s * 0.013, s * 0.03, thumbSide * 0.35, 0, TAU); g.fill();
  g.restore();
}
export function headProfile(g, T, c, pal, expr = {}, hat = true, style = 'man') {
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  const s = T.s;
  // neck
  smoothShape(g, [H(-0.035, -0.08), H(0.045, -0.09), H(0.04, -0.2), H(-0.05, -0.2)], pal.skinShade);
  // skull + face
  const face = [[-0.1, 0.03], [-0.07, 0.11], [0.02, 0.125], [0.085, 0.065], [0.093, 0.028], [0.09, 0.006], [0.126, -0.036], [0.104, -0.05], [0.104, -0.067], [0.096, -0.078], [0.101, -0.09], [0.09, -0.124], [0.035, -0.142], [-0.02, -0.115], [-0.06, -0.07], [-0.1, -0.02]];
  smoothShape(g, face.map((p) => H(p[0], p[1])), pal.skin);
  // soft shade on the back half of the face
  smoothShape(g, [H(-0.1, 0.03), H(-0.02, 0.1), H(0.0, -0.03), H(0.0, -0.12), H(-0.06, -0.07), H(-0.1, -0.02)], pal.skinShade + '99');
  // ear
  g.save(); g.beginPath(); const e = H(-0.02, -0.012);
  g.ellipse(e[0], e[1], s * 0.017, s * 0.03, 0.15, 0, TAU); g.fillStyle = pal.skinShade; g.fill(); g.restore();
  // hair (nape / sideburn)
  if (style === 'man') smoothShape(g, [H(-0.1, 0.045), H(-0.03, 0.06), H(-0.005, 0.02), H(-0.03, -0.01), H(-0.07, -0.05), H(-0.1, -0.03)], pal.hair);
  // eye
  const open = expr.eye === undefined ? 1 : expr.eye;
  const ec = H(0.072, 0.006 + (expr.look || 0) * 0.0);
  g.save(); g.fillStyle = pal.eye || '#17120f';
  g.beginPath(); g.ellipse(ec[0], ec[1], s * 0.011, s * 0.006 * Math.max(0.15, open), 0, 0, TAU); g.fill(); g.restore();
  // brow
  const b0 = H(0.05, 0.03 + (expr.brow || 0) * 0.01), b1 = H(0.09, 0.03 + (expr.brow || 0) * 0.006);
  g.strokeStyle = pal.hair; g.lineWidth = s * 0.007; g.lineCap = 'round';
  g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.stroke();
  // mouth line
  const m0 = H(0.08, -0.079), m1 = H(0.1, -0.079);
  g.strokeStyle = pal.lip; g.lineWidth = s * 0.005;
  g.beginPath(); g.moveTo(m0[0], m0[1]); g.lineTo(m1[0], m1[1]); g.stroke();
  if (hat) hatProfile(g, T, c, pal);
}
export function hatProfile(g, T, c, pal) {
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  // crown
  smoothShape(g, [H(-0.088, 0.055), H(-0.083, 0.14), H(-0.03, 0.172), H(0.035, 0.162), H(0.068, 0.13), H(0.08, 0.055)], pal.hat);
  // front pinch shadow
  smoothShape(g, [H(0.02, 0.16), H(0.06, 0.13), H(0.07, 0.07), H(0.045, 0.08), H(0.03, 0.14)], pal.hatShade);
  // band
  poly2(g, [H(-0.088, 0.056), H(0.08, 0.056), H(0.078, 0.082), H(-0.087, 0.084)], pal.hatBand);
  // brim (slight snap-brim: down at front, up at back)
  smoothShape(g, [H(-0.16, 0.07), H(-0.1, 0.05), H(0.05, 0.047), H(0.17, 0.03), H(0.175, 0.018), H(0.05, 0.034), H(-0.1, 0.04), H(-0.165, 0.062)], pal.hat);
}

// Businessman, side view, running (or walking) — facing +x.
export function hairProfile(g, T, c0, c) {
  const H = (x, y) => tr(T, c0[0] + x, c0[1] + y);
  if (c.style === 'bob') smoothShape(g, [H(-0.11, 0.02), H(-0.08, 0.13), H(0.03, 0.14), H(0.09, 0.08), H(0.07, 0.04), H(0.0, 0.07), H(-0.02, -0.02), H(-0.05, -0.1), H(-0.12, -0.08)], c.hair);
  else if (c.style === 'short') smoothShape(g, [H(-0.105, 0.02), H(-0.07, 0.125), H(0.04, 0.135), H(0.09, 0.08), H(0.05, 0.075), H(-0.01, 0.06), H(-0.03, 0.0), H(-0.09, -0.04)], c.hair);
  else if (c.style === 'ponytail') { smoothShape(g, [H(-0.105, 0.02), H(-0.07, 0.125), H(0.04, 0.135), H(0.09, 0.08), H(0.04, 0.07), H(-0.03, 0.02), H(-0.09, -0.03)], c.hair); smoothShape(g, [H(-0.1, 0.06), H(-0.2, 0.0), H(-0.23, -0.12), H(-0.16, -0.05), H(-0.11, 0.0)], c.hair); }
  else if (c.style === 'bun') { smoothShape(g, [H(-0.105, 0.02), H(-0.07, 0.125), H(0.04, 0.135), H(0.09, 0.08), H(0.04, 0.07), H(-0.03, 0.02), H(-0.09, -0.03)], c.hair); const b = H(-0.08, 0.12); g.beginPath(); g.arc(b[0], b[1], T.s * 0.045, 0, TAU); g.fillStyle = c.hair; g.fill(); }
  else if (c.style === 'cap') { smoothShape(g, [H(-0.1, 0.03), H(-0.06, 0.12), H(0.05, 0.12), H(0.1, 0.07), H(0.16, 0.055), H(0.1, 0.045), H(-0.09, 0.02)], '#4b4740'); smoothShape(g, [H(-0.09, 0.02), H(-0.1, -0.05), H(-0.05, -0.02)], c.hair); }
}
export function propSide(g, T, h, prop) {
  const X = (x, y) => tr(T, h[0] + x, h[1] + y);
  if (prop === 'lamp') { poly2(g, [X(-0.02, 0), X(0.02, 0), X(0.1, 0.22), X(0.07, 0.24)], '#2d3035'); smoothShape(g, [X(0.04, 0.22), X(0.2, 0.3), X(0.22, 0.2), X(0.1, 0.17)], '#34373c'); }
  else if (prop === 'plan') capsule(g, X(-0.16, -0.12), X(0.22, 0.14), T.s * 0.035, T.s * 0.035, '#cfc8b8');
  else if (prop === 'box') poly2(g, [X(-0.13, -0.08), X(0.15, -0.08), X(0.15, 0.14), X(-0.13, 0.14)], '#8e704f');
  else if (prop === 'folder') poly2(g, [X(-0.03, -0.14), X(0.03, -0.14), X(0.05, 0.18), X(-0.01, 0.18)], '#33373e');
  else if (prop === 'phone') poly2(g, [X(-0.02, -0.02), X(0.03, -0.02), X(0.035, 0.08), X(-0.015, 0.08)], '#141518');
}

export function faceFront(g, T, c, pal, expr = {}, kind = 'man', lightSide = -1) {
  const yaw = expr.yaw || 0, s = T.s;
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  const fx = (x) => x * (1 - Math.abs(yaw) * 0.18) + yaw * 0.03;
  const feat = (x) => x * (1 - Math.abs(yaw) * 0.25) + yaw * 0.048;
  g.save();
  if (expr.tilt) { const o = H(0, -0.05); g.translate(o[0], o[1]); g.rotate(expr.tilt); g.translate(-o[0], -o[1]); }
  // neck: tapered, with the jaw's shadow falling onto it
  smoothShape(g, [H(-0.04, -0.06), H(0.04, -0.06), H(0.043, -0.13), H(0.056, -0.2), H(0.0, -0.215), H(-0.056, -0.2), H(-0.043, -0.13)], pal.skin);
  { const a = H(0, -0.09), b = H(0, -0.17); const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, 'rgba(70,40,28,0.55)'); gr.addColorStop(1, 'rgba(70,40,28,0.05)');
    g.save(); smoothShape(g, [H(-0.04, -0.06), H(0.04, -0.06), H(0.043, -0.13), H(0.056, -0.2), H(0.0, -0.215), H(-0.056, -0.2), H(-0.043, -0.13)]); g.clip(); g.fillStyle = gr; g.fillRect(Math.min(a[0], b[0]) - T.s * 0.1, a[1], T.s * 0.2, b[1] - a[1]); g.restore(); }
  // hair behind (long styles)
  if (kind === 'bob') smoothShape(g, [H(-0.1, 0.06), H(-0.095, -0.12), H(-0.06, -0.14), H(0.06, -0.14), H(0.095, -0.12), H(0.1, 0.06)].map((p) => p), pal.hair);
  // ears
  for (const sd of [-1, 1]) {
    const vis = 1 - clamp(sd * yaw * 2.2);
    if (vis <= 0.05 || kind === 'bob') continue;
    const e = H(fx(sd * 0.079), -0.01);
    g.beginPath(); g.ellipse(e[0], e[1], s * 0.014 * vis, s * 0.028, 0, 0, TAU); g.fillStyle = pal.skinShade; g.fill();
  }
  // face
  const face = [[0, 0.125], [0.066, 0.108], [0.078, 0.045], [0.076, -0.028], [0.063, -0.083], [0.036, -0.118], [0, -0.13], [-0.036, -0.118], [-0.063, -0.083], [-0.076, -0.028], [-0.078, 0.045], [-0.066, 0.108]];
  smoothShape(g, face.map((p) => H(fx(p[0]), p[1])), pal.skin);
  g.save(); smoothShape(g, face.map((p) => H(fx(p[0]), p[1]))); g.clip();
  { // soft modelling: jaw falloff, eye sockets, warm cheeks
    const jc = H(feat(0), -0.13), jr = s * 0.12;
    let gr = g.createRadialGradient(jc[0], jc[1], 0, jc[0], jc[1], jr);
    gr.addColorStop(0, 'rgba(60,35,25,0.18)'); gr.addColorStop(1, 'rgba(60,35,25,0)'); g.fillStyle = gr; g.fillRect(jc[0] - jr, jc[1] - jr, jr * 2, jr * 2);
    for (const sd of [-1, 1]) {
      const ec = H(feat(sd * 0.034), 0.02), er = s * 0.03;
      gr = g.createRadialGradient(ec[0], ec[1], 0, ec[0], ec[1], er); gr.addColorStop(0, 'rgba(70,40,30,0.16)'); gr.addColorStop(1, 'rgba(70,40,30,0)');
      g.fillStyle = gr; g.fillRect(ec[0] - er, ec[1] - er, er * 2, er * 2);
      const cc = H(feat(sd * 0.045), -0.035), cr = s * 0.03;
      gr = g.createRadialGradient(cc[0], cc[1], 0, cc[0], cc[1], cr); gr.addColorStop(0, 'rgba(190,90,70,0.10)'); gr.addColorStop(1, 'rgba(190,90,70,0)');
      g.fillStyle = gr; g.fillRect(cc[0] - cr, cc[1] - cr, cr * 2, cr * 2);
    }
    const fh = H(feat(0.0), 0.085), fr = s * 0.07;
    gr = g.createRadialGradient(fh[0], fh[1], 0, fh[0], fh[1], fr); gr.addColorStop(0, 'rgba(255,235,210,0.10)'); gr.addColorStop(1, 'rgba(255,235,210,0)');
    g.fillStyle = gr; g.fillRect(fh[0] - fr, fh[1] - fr, fr * 2, fr * 2);
  }
  g.restore();
  // side shading (away from the light)
  const sh = lightSide;
  smoothShape(g, [H(fx(-sh * 0.078), 0.06), H(fx(-sh * 0.05), 0.05), H(fx(-sh * 0.042), -0.03), H(fx(-sh * 0.03), -0.11), H(fx(-sh * 0.06), -0.09), H(fx(-sh * 0.077), -0.03)], pal.skinShade + '77');
  // beard
  if (pal.beard) smoothShape(g, [H(fx(-0.07), -0.04), H(fx(-0.045), -0.1), H(0, -0.135), H(fx(0.045), -0.1), H(fx(0.07), -0.04), H(fx(0.03), -0.07), H(0, -0.06), H(fx(-0.03), -0.07)], pal.hair);
  // eyes
  const open = [expr.eyeL ?? 1, expr.eyeR ?? 1];
  const squint = expr.squint || 0;
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    const ex = feat(sd * 0.034), ey = 0.012 - squint * 0.002;
    const cc = H(ex, ey);
    const wx = s * 0.0135 * (1 - (sd * yaw > 0 ? 0 : Math.abs(yaw) * 0.35)), hy = s * 0.0068 * Math.max(0.06, open[i] * (1 - squint * 0.55));
    if (open[i] > 0.12) {
      g.beginPath(); g.ellipse(cc[0], cc[1], wx, hy, 0, 0, TAU); g.fillStyle = '#ddd3c6'; g.fill();
      g.save(); g.clip();
      const ir = H(ex + (expr.gazeX || 0) * 0.009, ey + (expr.gazeY || 0) * 0.004);
      g.beginPath(); g.arc(ir[0], ir[1], s * 0.0072, 0, TAU); g.fillStyle = pal.eye || '#1a1411'; g.fill();
      g.restore();
      // upper lid
      g.beginPath(); g.ellipse(cc[0], cc[1], wx * 1.05, hy, 0, Math.PI, TAU); g.strokeStyle = '#21160f'; g.lineWidth = s * 0.0032; g.stroke();
    } else {
      // closed (wink / squeeze): a soft curved lid line
      g.beginPath(); g.moveTo(cc[0] - wx, cc[1]); g.quadraticCurveTo(cc[0], cc[1] + s * 0.005, cc[0] + wx, cc[1] - s * 0.001);
      g.strokeStyle = '#2a1c14'; g.lineWidth = s * 0.0042; g.lineCap = 'round'; g.stroke();
    }
  }
  // brows
  for (const [i, sd] of [[0, -1], [1, 1]]) {
    const br = (expr.brow || 0) + (i === 0 ? expr.browL || 0 : expr.browR || 0);
    const inner = H(feat(sd * 0.016), 0.036 + br * 0.008 - (expr.knit || 0) * 0.006);
    const outer = H(feat(sd * 0.052), 0.035 + br * 0.005 + (expr.knit || 0) * 0.002);
    g.beginPath(); g.moveTo(inner[0], inner[1]); g.quadraticCurveTo((inner[0] + outer[0]) / 2, Math.min(inner[1], outer[1]) - s * 0.004, outer[0], outer[1]);
    g.strokeStyle = pal.brow || pal.hair; g.lineWidth = s * 0.0065; g.lineCap = 'round'; g.stroke();
  }
  // nose: shadow plane + base
  const n0 = H(feat(0.0), 0.02), n1 = H(feat(0.012 * -sh) + yaw * 0.012, -0.045), n2 = H(feat(-0.012 * sh), -0.052);
  poly2(g, [n0, n1, n2], pal.skinShade + 'cc');
  const nb = H(feat(0) + yaw * 0.01, -0.05);
  g.beginPath(); g.ellipse(nb[0], nb[1], s * 0.013, s * 0.004, 0, 0, TAU); g.fillStyle = pal.skinShade; g.fill();
  // mouth
  const sm = expr.smile || 0, op = expr.open || 0;
  const ml = H(feat(-0.022 - sm * 0.003), -0.077 + sm * 0.004), mr = H(feat(0.022 + sm * 0.003), -0.077 + sm * 0.006 + (expr.smirk || 0) * 0.004);
  const mc = H(feat(0), -0.079 - sm * 0.003);
  if (op > 0.05) {
    g.beginPath(); g.moveTo(ml[0], ml[1]); g.quadraticCurveTo(mc[0], mc[1] + s * op * 0.02, mr[0], mr[1]); g.quadraticCurveTo(mc[0], mc[1] - s * 0.002, ml[0], ml[1]);
    g.fillStyle = '#3a1e18'; g.fill();
  }
  g.beginPath(); g.moveTo(ml[0], ml[1]); g.quadraticCurveTo(mc[0], mc[1] + s * sm * 0.006, mr[0], mr[1]);
  g.strokeStyle = pal.lip; g.lineWidth = s * 0.0048; g.lineCap = 'round'; g.stroke();
  // lower-lip light
  const ll = H(feat(0), -0.088);
  g.beginPath(); g.ellipse(ll[0], ll[1], s * 0.012, s * 0.003, 0, 0, TAU); g.fillStyle = pal.skinShade + '88'; g.fill();
  // glasses
  if (pal.glasses) {
    g.strokeStyle = '#1b1b1d'; g.lineWidth = s * 0.004;
    for (const sd of [-1, 1]) { const q = H(feat(sd * 0.034), 0.01); g.beginPath(); g.roundRect(q[0] - s * 0.024, q[1] - s * 0.016, s * 0.048, s * 0.03, s * 0.008); g.stroke(); }
    const a = H(feat(-0.01), 0.012), b = H(feat(0.01), 0.012); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // hair (front)
  hairFront(g, T, c, pal, kind, fx);
  g.restore();
}
export function hairFront(g, T, c, pal, kind, fx) {
  const H = (x, y) => tr(T, c[0] + x, c[1] + y);
  if (kind === 'man') { // temples under the hat brim
    for (const sd of [-1, 1]) smoothShape(g, [H(fx(sd * 0.078), 0.07), H(fx(sd * 0.06), 0.1), H(fx(sd * 0.066), 0.045), H(fx(sd * 0.079), 0.02)], pal.hair);
  } else if (kind === 'bob') {
    smoothShape(g, [H(fx(-0.1), 0.02), H(fx(-0.09), 0.12), H(0, 0.165), H(fx(0.09), 0.12), H(fx(0.1), 0.02), H(fx(0.085), -0.1), H(fx(0.07), -0.06), H(fx(0.06), 0.08), H(fx(0.0), 0.1), H(fx(-0.06), 0.085), H(fx(-0.07), -0.06), H(fx(-0.085), -0.1)], pal.hair);
  } else if (kind === 'short') {
    smoothShape(g, [H(fx(-0.08), 0.03), H(fx(-0.075), 0.12), H(0, 0.158), H(fx(0.075), 0.125), H(fx(0.08), 0.04), H(fx(0.066), 0.08), H(fx(0.02), 0.11), H(fx(-0.06), 0.1)], pal.hair);
  } else if (kind === 'ponytail' || kind === 'bun') {
    smoothShape(g, [H(fx(-0.08), 0.02), H(fx(-0.074), 0.12), H(0, 0.158), H(fx(0.074), 0.12), H(fx(0.08), 0.02), H(fx(0.064), 0.09), H(fx(0.0), 0.118), H(fx(-0.064), 0.09)], pal.hair);
    if (kind === 'bun') { const b = H(0, 0.175); g.beginPath(); g.arc(b[0], b[1], T.s * 0.042, 0, TAU); g.fillStyle = pal.hair; g.fill(); }
  } else if (kind === 'cap') {
    smoothShape(g, [H(fx(-0.084), 0.05), H(fx(-0.08), 0.12), H(0, 0.15), H(fx(0.08), 0.12), H(fx(0.084), 0.05)], '#4b4740');
    smoothShape(g, [H(fx(-0.09), 0.06), H(fx(0.09), 0.06), H(fx(0.1), 0.035), H(0, 0.02), H(fx(-0.1), 0.035)], '#3a3732');
    for (const sd of [-1, 1]) smoothShape(g, [H(fx(sd * 0.079), 0.04), H(fx(sd * 0.07), 0.05), H(fx(sd * 0.072), -0.01), H(fx(sd * 0.08), -0.02)], pal.hair);
  }
}
export function hatFront(g, T, c, pal, yaw = 0) {
  const H = (x, y) => tr(T, c[0] + x + yaw * 0.02, c[1] + y);
  smoothShape(g, [H(-0.082, 0.07), H(-0.078, 0.15), H(-0.02, 0.182), H(0.0, 0.168), H(0.02, 0.182), H(0.078, 0.15), H(0.082, 0.07)], pal.hat);
  smoothShape(g, [H(-0.012, 0.172), H(0.0, 0.1), H(0.012, 0.172), H(0.0, 0.165)], pal.hatShade);
  poly2(g, [H(-0.083, 0.072), H(0.083, 0.072), H(0.083, 0.098), H(-0.083, 0.098)], pal.hatBand);
  // brim seen slightly from below: a thin ellipse, front dipping
  const b = H(0, 0.066);
  g.save(); g.beginPath(); g.ellipse(b[0], b[1], T.s * 0.155, T.s * 0.022, 0, 0, TAU); g.fillStyle = pal.hat; g.fill();
  g.beginPath(); g.ellipse(b[0], b[1] + T.s * 0.006, T.s * 0.14, T.s * 0.014, 0, 0, Math.PI); g.fillStyle = pal.hatShade; g.fill(); g.restore();
}

export function flashlight(g, T, h, aim, on) {
  const s = T.s;
  // body: seen from the front when aimed up at the viewer, from the side when hanging down
  if (aim > 0.5) {
    const lens = [h[0], h[1] - s * 0.05];
    g.beginPath(); g.arc(lens[0], lens[1], s * 0.034, 0, TAU); g.fillStyle = '#17181b'; g.fill();
    g.beginPath(); g.arc(lens[0], lens[1], s * 0.025, 0, TAU); g.fillStyle = on > 0 ? `rgba(255,244,222,${0.35 + on * 0.65})` : '#3a3c40'; g.fill();
    return { lens, r: s * 0.025, dir: 'viewer' };
  }
  const a = [h[0], h[1] - s * 0.02], b = [h[0] + s * 0.02, h[1] + s * 0.17];
  capsule(g, a, b, s * 0.02, s * 0.026, '#1a1b1e');
  g.beginPath(); g.ellipse(b[0], b[1] + s * 0.012, s * 0.026, s * 0.009, 0, 0, TAU); g.fillStyle = on > 0 ? '#fff4de' : '#3a3c40'; g.fill();
  return { lens: [b[0], b[1] + s * 0.012], r: s * 0.024, dir: 'down' };
}
export function propFront(g, T, h, prop, pose = {}) {
  const s = T.s;
  const X = (x, y) => [h[0] + s * x, h[1] - s * y];
  if (prop === 'lamp') {
    // desk lamp held against the chest: round base, jointed arm, cone shade with the bulb showing
    smoothShape(g, [X(-0.09, -0.07), X(0.09, -0.07), X(0.085, -0.035), X(-0.085, -0.035)], '#2a2d31');
    capsule(g, X(-0.02, -0.04), X(-0.07, 0.18), s * 0.013, s * 0.013, '#44484e');
    g.beginPath(); const j = X(-0.07, 0.18); g.arc(j[0], j[1], s * 0.02, 0, TAU); g.fillStyle = '#2f3237'; g.fill();
    capsule(g, X(-0.07, 0.18), X(0.07, 0.3), s * 0.012, s * 0.012, '#44484e');
    smoothShape(g, [X(0.04, 0.34), X(0.1, 0.36), X(0.2, 0.25), X(0.17, 0.2), X(0.05, 0.26)], '#4a4e55');
    g.beginPath(); const bl = X(0.14, 0.215); g.ellipse(bl[0], bl[1], s * 0.04, s * 0.016, -0.7, 0, TAU); g.fillStyle = '#d9d2bf'; g.fill();
  } else if (prop === 'plan') {
    capsule(g, X(-0.2, -0.1), X(0.16, 0.28), s * 0.038, s * 0.038, '#d6cfbf');
    const e = X(0.16, 0.28); g.beginPath(); g.ellipse(e[0], e[1], s * 0.03, s * 0.038, -0.8, 0, TAU); g.fillStyle = '#ece6d8'; g.fill();
    g.beginPath(); g.ellipse(e[0], e[1], s * 0.012, s * 0.016, -0.8, 0, TAU); g.fillStyle = '#b9b1a0'; g.fill();
    for (const u of [0.35, 0.62]) { const a = X(lerp(-0.2, 0.16, u) - 0.03, lerp(-0.1, 0.28, u) + 0.02), b = X(lerp(-0.2, 0.16, u) + 0.03, lerp(-0.1, 0.28, u) - 0.03); g.strokeStyle = '#4a5a6e'; g.lineWidth = s * 0.008; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  } else if (prop === 'phone') {
    const glowOn = pose.screen ?? 1;
    g.save(); g.translate(...X(0.0, 0.1)); g.rotate(-0.12);
    g.beginPath(); g.roundRect(-s * 0.04, -s * 0.08, s * 0.08, s * 0.16, s * 0.012); g.fillStyle = '#121316'; g.fill();
    g.beginPath(); g.roundRect(-s * 0.034, -s * 0.072, s * 0.068, s * 0.144, s * 0.008); g.fillStyle = `rgba(226,230,236,${0.25 + glowOn * 0.7})`; g.fill();
    // generic "request" symbol: calendar square with a check mark (no text)
    g.strokeStyle = `rgba(40,44,52,${0.4 + glowOn * 0.5})`; g.lineWidth = s * 0.005; g.lineJoin = 'round';
    g.beginPath(); g.roundRect(-s * 0.02, -s * 0.03, s * 0.04, s * 0.036, s * 0.004); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.02, -s * 0.018); g.lineTo(s * 0.02, -s * 0.018); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.009, -s * 0.004); g.lineTo(-s * 0.002, s * 0.003); g.lineTo(s * 0.011, -s * 0.01); g.stroke();
    for (let i = 0; i < 2; i++) { g.beginPath(); g.roundRect(-s * 0.022, s * (0.02 + i * 0.014), s * (0.044 - i * 0.014), s * 0.006, s * 0.003); g.fillStyle = `rgba(40,44,52,${0.25 + glowOn * 0.3})`; g.fill(); }
    g.restore();
  } else if (prop === 'box') {
    const a = X(-0.14, -0.04), b = X(0.16, 0.2);
    poly2(g, [a, [b[0], a[1]], b, [a[0], b[1]]], '#8f7050');
    poly2(g, [[a[0], b[1]], b, [b[0] - s * 0.03, b[1] - s * 0.035], [a[0] + s * 0.03, b[1] - s * 0.035]], '#a3845f');
    g.strokeStyle = '#d6c7a5'; g.lineWidth = s * 0.006;
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    g.beginPath(); g.moveTo(cx, a[1]); g.lineTo(cx, b[1]); g.moveTo(a[0], cy); g.lineTo(b[0], cy); g.stroke();
  } else if (prop === 'folder') {
    g.save(); g.translate(...X(0.0, 0.12)); g.rotate(-0.08);
    g.fillStyle = '#e4dfd4'; g.fillRect(-s * 0.1, -s * 0.15, s * 0.19, s * 0.27);
    g.fillStyle = '#353941'; g.beginPath(); g.roundRect(-s * 0.11, -s * 0.13, s * 0.22, s * 0.28, s * 0.01); g.fill();
    g.fillStyle = '#4a4f58'; g.fillRect(-s * 0.11, -s * 0.13, s * 0.22, s * 0.02);
    g.restore();
  }
}

// Customer seen from behind (foreground silhouettes in the flashlight shot). aim: 0..1 arm raised forward