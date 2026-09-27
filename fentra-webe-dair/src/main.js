import { createCity } from './city.js';
import { placeCamera } from './camera.js';
import { createOverlay } from './overlay.js';
import { DURATION } from './anim.js';

await Promise.all(['800 40px Manrope', '700 40px Manrope', '600 40px Manrope', '500 40px Manrope', '400 40px Manrope',
  '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"'].map((f) => document.fonts.load(f, 'ĞÜŞİÖÇğüşıöç')));

const city = createCity(document.getElementById('gl'));
const overlay = createOverlay(document.getElementById('ui'), city);

window.renderAt = (t) => {
  placeCamera(city.camera, t, city);
  city.camera.updateMatrixWorld();
  city.update(t);
  overlay.update(t);
  city.render();
};
window.DURATION = DURATION;
window.renderAt(0);
window.filmReady = true;
