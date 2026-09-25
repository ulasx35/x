import { W, H, clamp, lerp, TAU, peek } from './engine.js';

// ------------------------------------------------------------------ helpers shared by the shots
export function actorT(cam, pos, dir = 1) {
  const p = cam.project(pos);
  return { ox: p[0], oy: p[1], s: cam.scaleAt(pos), dir, d: p[2] };
}
// polyline path with arc-length parametrisation
export function makePath(pts) {
  const seg = []; let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]); seg.push({ a: pts[i], b: pts[i + 1], l, s0: L }); L += l; }
  return {
    L,
    at(s) {
      s = clamp(s, 0, L);
      const g = seg.find((q) => s <= q.s0 + q.l) || seg[seg.length - 1];
      const u = (s - g.s0) / g.l;
      return { p: [lerp(g.a[0], g.b[0], u), 0, lerp(g.a[2], g.b[2], u)], dir: [(g.b[0] - g.a[0]) / g.l, (g.b[2] - g.a[2]) / g.l] };
    },
  };
}
export function contactShadow(ctx, cam, pos, r = 0.35, a = 0.55) {
  const p = cam.project(pos); if (p[2] <= 0.1) return;
  const s = cam.scaleAt(pos);
  ctx.save(); ctx.globalAlpha = a; ctx.filter = `blur(${Math.max(2, s * 0.06).toFixed(1)}px)`;
  ctx.fillStyle = '#050608'; ctx.beginPath(); ctx.ellipse(p[0], p[1], s * r, s * r * 0.28, 0, 0, TAU); ctx.fill(); ctx.restore();
}
// Mirror the last drawn figure in the wet ground (soft, dim), below its ground line.
export function mirrorBelow(ctx, groundY, a = 0.22, blur = 5) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, groundY, W, H - groundY); ctx.clip();
  ctx.globalAlpha = a; ctx.filter = `blur(${blur}px)`;
  ctx.setTransform(1, 0, 0, -0.9, 0, groundY * 1.9);
  ctx.drawImage(peek(0), 0, 0); ctx.restore();
}

