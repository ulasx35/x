const fonts = ['400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '400 40px "Fraunces"', '500 40px "Fraunces"', '400 40px "Manrope"', '500 40px "Manrope"', '600 40px "Manrope"'];
await Promise.all(fonts.map((f) => document.fonts.load(f, 'Görünür ÇİŞĞÜÖ çışğüö')));
const mod = await import('./film.js');
await mod.boot(document.getElementById('c'));
window.filmReady = true;
