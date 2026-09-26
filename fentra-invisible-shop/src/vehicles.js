// Vehicles seen in profile on the road: a small hatchback and a classic moped with its rider.
import { TAU, clamp, lerp, tintS, PAL, poly, smooth, ink, line, ell, rrectPath } from './core.js';
import { LW } from './street.js';

// Car body outline in metres (x from rear 0 → front 3.9, y up), facing +x.
const BODY = [[0.02, 0.38], [0.0, 0.62], [0.08, 0.86], [0.35, 0.95], [0.62, 1.38], [0.95, 1.46], [2.3, 1.46], [2.7, 1.38], [3.15, 0.98], [3.72, 0.88], [3.9, 0.7], [3.9, 0.42], [3.78, 0.3], [0.12, 0.3]];
const GLASS = [[0.72, 0.98], [0.9, 1.36], [1.55, 1.38], [1.55, 0.98]];
const GLASS2 = [[1.65, 0.98], [1.65, 1.38], [2.28, 1.38], [2.62, 1.3], [2.98, 0.98]];

export function drawCar(ctx, cam, car, t) {
  // car: { x (rear-bumper world X when facing +x), z (near side plane), dir (+1 → right, -1 ← left), color, v }
  const Zs = car.z;
  const k = cam.plane(ctx, Zs), u = 1 / k, lw = LW(k);
  const dir = car.dir;
  const L = 3.9;
  // local → world X
  const X = (x) => dir > 0 ? car.x + x : car.x - x;
  ctx.save();
  // shadow on the road (projected, soft)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  {
    const a = cam.P(X(0.1), 0, Zs + 0.05), b = cam.P(X(L - 0.1), 0, Zs + 0.05), c = cam.P(X(L - 0.2), 0, Zs - 1.6), d = cam.P(X(0.2), 0, Zs - 1.6);
    ctx.save(); ctx.filter = `blur(${Math.max(2, k * 0.06).toFixed(1)}px)`; poly(ctx, [a, b, c, d]); ctx.fillStyle = 'rgba(60,60,75,0.35)'; ctx.fill(); ctx.restore();
  }
  // roof top (seen slightly from above)
  if (cam.y > 1.46) {
    const r0 = cam.P(X(0.95), 1.46, Zs), r1 = cam.P(X(2.3), 1.46, Zs), r2 = cam.P(X(2.25), 1.44, Zs - 1.5), r3 = cam.P(X(1.0), 1.44, Zs - 1.5);
    poly(ctx, [r0, r1, r2, r3]); ink(ctx, tintS(car.color, 0.12), LW(k) * 0.8);
  }
  cam.plane(ctx, Zs);
  ctx.transform(dir, 0, 0, 1, dir > 0 ? 0 : 2 * car.x, 0); // mirror for leftward travel
  const bx = car.x;
  const B = BODY.map(([x, y]) => [bx + x, y]);
  smooth(ctx, B); ink(ctx, car.color, lw * u);
  // lower sill shading + highlight line
  ctx.save(); smooth(ctx, B); ctx.clip();
  ctx.fillStyle = 'rgba(40,40,60,0.18)'; ctx.fillRect(bx, 0.3, L, 0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx + 0.2, 0.83, 3.5, 0.03);
  ctx.restore();
  // windows with a soft sky reflection
  for (const G of [GLASS, GLASS2]) {
    const g = G.map(([x, y]) => [bx + x, y]);
    poly(ctx, g); const gr = ctx.createLinearGradient(0, 0.98, 0, 1.4); gr.addColorStop(0, '#5E6A74'); gr.addColorStop(1, '#AFC0C9');
    ink(ctx, gr, lw * 0.9 * u);
    ctx.save(); poly(ctx, g); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const off = ((car.x * 0.7) % 1.6 + 1.6) % 1.6; // reflection slides as the car moves
    ctx.beginPath(); ctx.moveTo(bx + off, 0.9); ctx.lineTo(bx + off + 0.3, 0.9); ctx.lineTo(bx + off + 0.6, 1.5); ctx.lineTo(bx + off + 0.3, 1.5); ctx.fill(); ctx.restore();
  }
  // door lines, handle, mirror, lights
  line(ctx, [[bx + 1.6, 0.36], [bx + 1.6, 0.98]], lw * 0.7 * u);
  line(ctx, [[bx + 2.95, 0.4], [bx + 3.0, 0.98]], lw * 0.7 * u);
  rrectPath(ctx, bx + 2.1, 0.85, 0.22, 0.05, 0.02); ink(ctx, tintS(car.color, -0.25), 0);
  ctx.beginPath(); ctx.moveTo(bx + 2.98, 1.0); ctx.lineTo(bx + 3.12, 1.08); ctx.lineTo(bx + 3.14, 0.98); ctx.closePath(); ink(ctx, tintS(car.color, -0.1), lw * 0.7 * u);
  rrectPath(ctx, bx + 3.7, 0.62, 0.2, 0.12, 0.04); ink(ctx, '#F4EEDC', lw * 0.6 * u);
  rrectPath(ctx, bx - 0.02, 0.62, 0.14, 0.14, 0.04); ink(ctx, '#B8574A', lw * 0.6 * u);
  // wheels
  const rot = (car.x * dir) / 0.31; // rolling angle
  for (const wx of [0.72, 3.12]) {
    const cx = bx + wx, cyw = 0.31;
    ctx.beginPath(); ctx.arc(cx, cyw + 0.02, 0.4, 0, Math.PI); ctx.fillStyle = tintS(car.color, -0.45); ctx.fill(); // arch shadow
    ell(ctx, cx, cyw, 0.31, 0.31, '#2E3036', lw * u);
    ell(ctx, cx, cyw, 0.18, 0.18, '#C9CCD0', lw * 0.7 * u);
    ctx.save(); ctx.translate(cx, cyw); ctx.rotate(-rot);
    ctx.strokeStyle = '#8E9399'; ctx.lineWidth = lw * 0.6 * u;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.04, Math.sin(a) * 0.04); ctx.lineTo(Math.cos(a) * 0.16, Math.sin(a) * 0.16); ctx.stroke(); }
    ctx.restore();
    ell(ctx, cx, cyw, 0.035, 0.035, '#6F747A', 0);
  }
  // driver silhouette
  ctx.save(); poly(ctx, GLASS.map(([x, y]) => [bx + x, y])); ctx.clip();
  ell(ctx, bx + 1.3, 1.2, 0.1, 0.12, 'rgba(40,40,50,0.55)', 0); ctx.restore();
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function drawMoped(ctx, cam, m, t) {
  // m: { x (centre), z, dir, color, rider: {skin, jacket, helmet, trousers} }
  const k = cam.plane(ctx, m.z), u = 1 / k, lw = LW(k);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  { const a = cam.P(m.x - 0.8, 0, m.z), b = cam.P(m.x + 0.8, 0, m.z); ctx.save(); ctx.filter = `blur(${Math.max(1.5, k * 0.04).toFixed(1)}px)`; ctx.fillStyle = 'rgba(60,60,75,0.3)'; ctx.beginPath(); ctx.ellipse((a[0] + b[0]) / 2, a[1], Math.abs(b[0] - a[0]) / 2, k * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  cam.plane(ctx, m.z);
  ctx.transform(m.dir, 0, 0, 1, m.dir > 0 ? 0 : 2 * m.x, 0);
  const x = m.x, rot = (m.x * m.dir) / 0.22;
  const R = m.rider;
  const S = u * lw;
  // wheels
  for (const wx of [-0.62, 0.66]) {
    ell(ctx, x + wx, 0.22, 0.22, 0.22, '#2E3036', S);
    ell(ctx, x + wx, 0.22, 0.12, 0.12, '#C9CCD0', S * 0.7);
    ctx.save(); ctx.translate(x + wx, 0.22); ctx.rotate(-rot); ctx.strokeStyle = '#8E9399'; ctx.lineWidth = S * 0.6; for (let i = 0; i < 3; i++) { const a = i * TAU / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.11, Math.sin(a) * 0.11); ctx.stroke(); } ctx.restore();
  }
  // rider legs (behind the leg shield) — seated
  const hipX = x - 0.28, hipY = 0.86;
  ctx.beginPath(); ctx.moveTo(hipX, hipY + 0.06); ctx.lineTo(hipX + 0.46, hipY + 0.02); ctx.lineTo(hipX + 0.5, 0.4); ctx.lineTo(hipX + 0.38, 0.38); ctx.lineTo(hipX + 0.36, hipY - 0.08); ctx.lineTo(hipX - 0.04, hipY - 0.1); ctx.closePath(); ink(ctx, R.trousers, S);
  rrectPath(ctx, hipX + 0.33, 0.3, 0.28, 0.1, 0.04); ink(ctx, '#2B2B2E', S * 0.8);
  // body: rear cowl, floorboard, leg shield
  ctx.beginPath(); ctx.moveTo(x - 0.95, 0.5); ctx.quadraticCurveTo(x - 0.95, 0.86, x - 0.55, 0.9); ctx.lineTo(x - 0.05, 0.86); ctx.quadraticCurveTo(x + 0.1, 0.6, x + 0.1, 0.36); ctx.lineTo(x - 0.35, 0.3); ctx.quadraticCurveTo(x - 0.7, 0.28, x - 0.95, 0.5); ctx.closePath(); ink(ctx, m.color, S);
  ctx.beginPath(); ctx.moveTo(x + 0.2, 0.32); ctx.lineTo(x + 0.46, 1.08); ctx.lineTo(x + 0.6, 1.1); ctx.lineTo(x + 0.54, 0.62); ctx.quadraticCurveTo(x + 0.62, 0.42, x + 0.78, 0.36); ctx.lineTo(x + 0.4, 0.3); ctx.closePath(); ink(ctx, m.color, S);
  ctx.beginPath(); ctx.moveTo(x + 0.66, 0.22); ctx.lineTo(x + 0.53, 1.18); ink(ctx, null, S * 1.2);
  rrectPath(ctx, x - 0.68, 0.9, 0.62, 0.1, 0.05); ink(ctx, '#3A3533', S);
  ctx.beginPath(); ctx.moveTo(x + 0.44, 1.2); ctx.lineTo(x + 0.66, 1.22); ink(ctx, null, S * 1.4);
  ell(ctx, x + 0.62, 1.1, 0.07, 0.06, '#F3EEDF', S * 0.7);
  // rider torso, arm, head
  ctx.beginPath(); ctx.moveTo(hipX - 0.1, hipY); ctx.lineTo(hipX + 0.1, hipY - 0.02); ctx.lineTo(hipX + 0.2, 1.42); ctx.lineTo(hipX + 0.02, 1.47); ctx.quadraticCurveTo(hipX - 0.14, 1.2, hipX - 0.1, hipY); ctx.closePath(); ink(ctx, R.jacket, S);
  ctx.beginPath(); ctx.moveTo(hipX + 0.12, 1.4); ctx.lineTo(x + 0.3, 1.14); ctx.lineTo(x + 0.46, 1.2); ink(ctx, null, S * 5.5, R.jacket); ctx.beginPath(); ctx.moveTo(hipX + 0.12, 1.4); ctx.lineTo(x + 0.3, 1.14); ctx.lineTo(x + 0.46, 1.2); ink(ctx, null, 0);
  ell(ctx, x + 0.46, 1.2, 0.045, 0.045, R.skin, S * 0.7);
  ell(ctx, hipX + 0.16, 1.58, 0.1, 0.11, R.skin, S);
  ctx.beginPath(); ctx.ellipse(hipX + 0.14, 1.62, 0.14, 0.13, 0, Math.PI * 0.95, Math.PI * 2.1); ctx.closePath(); ink(ctx, R.helmet, S);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
