// Character model sheet (turnaround / expressions) — used to lock designs before animating.
import { W, H, figure } from './engine.js';
import { MAN, CUSTOMERS, gait, RUN, manSide, manFront, manBack, personFront, faceFront, hatFront, manSeated } from './characters.js';

export async function boot(canvas) {
  const ctx = canvas.getContext('2d');
  window.renderAt = () => {
    ctx.fillStyle = '#6f6a63'; ctx.fillRect(0, 0, W, H);
    const lab = (t, x, y) => { ctx.fillStyle = '#222'; ctx.font = '500 22px "Inter Tight"'; ctx.fillText(t, x, y); };
    // row 1: run cycle phases (side)
    for (let i = 0; i < 4; i++) {
      const t = i * RUN.T / 4;
      const p = gait(t, RUN);
      const T = { ox: 150 + i * 250 - p.px * 190, oy: 560, s: 190, dir: 1 };
      manSide(ctx, T, p);
    }
    lab('run cycle — side', 20, 40);
    // row 2: front, cower, back
    manFront(ctx, { ox: 150, oy: 1080, s: 250, dir: 1 }, { head: { gazeX: 0 } });
    manFront(ctx, { ox: 420, oy: 1080, s: 250, dir: 1 }, { crouch: 0.6, cover: 1, head: { eyeL: 1, eyeR: 1, brow: 1, gazeX: -0.6 } });
    manBack(ctx, { ox: 680, oy: 1080, s: 250, dir: 1 }, {});
    manBack(ctx, { ox: 920, oy: 1080, s: 250, dir: 1 }, { phase: 0.25 });
    lab('front · cower · back · back run', 20, 620);
    // row 3: faces
    const exprs = [{}, { brow: 1.2, knit: 0.4, gazeX: -0.8 }, { smile: 0.8, eyeL: 0.8, eyeR: 0.8 }, { smile: 0.9, eyeR: 0.0, browR: -0.4, yaw: 0.1 }];
    exprs.forEach((e, i) => {
      const T = { ox: 140 + i * 265, oy: 1400, s: 1100, dir: 1 };
      faceFront(ctx, T, [0, 0], MAN, e, 'man', -1);
      hatFront(ctx, T, [0, 0], MAN, e.yaw || 0);
    });
    lab('expressions: neutral · anxious · content · wink', 20, 1130);
    // row 4: customers
    CUSTOMERS.forEach((c, i) => personFront(ctx, { ox: 110 + i * 215, oy: 1900, s: 245, dir: 1 }, c, { light: i % 2 ? 'down' : 'up', lightOn: 1, expr: { brow: 0.4, smile: 0.2 } }));
    lab('customers', 20, 1480);
    return true;
  };
}
