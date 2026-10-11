// Small, deterministic animation helpers: everything on screen is a pure function of time t.
import cues from './cues.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const outCubic = (k) => 1 - Math.pow(1 - k, 3);
export const outQuint = (k) => 1 - Math.pow(1 - k, 5);
export const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
export const inCubic = (k) => k * k * k;
export const outBack = (k, s = 1.5) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
// 0 → 1 over [a, a+fin], hold, 1 → 0 over [b-fout, b]
export const win = (t, a, b, fin = 0.35, fout = 0.35) => Math.min(smooth(prog(t, a, a + fin)), 1 - smooth(prog(t, b - fout, b)));
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

export { cues };
export const DURATION = cues.duration;
export const scene = (name) => cues.scenes[name];

// start time of a word, found by caption text inside a sentence: at('hook', 1, 'dokunursunuz')
const norm = (w) => w.toLocaleLowerCase('tr').replace(/[,.:;?!"…]/g, '');
export function word(sceneName, sent, text, nth = 0) {
  const s = cues.sentences.find((x) => x.scene === sceneName && x.idx === sent);
  if (!s) throw new Error(`no sentence ${sceneName}/${sent}`);
  const ids = s.phrases.flatMap((p) => cues.phrases[p].words);
  const hits = ids.filter((i) => norm(cues.words[i].w).startsWith(norm(text)));
  if (!hits[nth] && hits[nth] !== 0) throw new Error(`no word "${text}" in ${sceneName}/${sent}`);
  return cues.words[hits[nth]];
}
export const at = (sc, sent, text, nth) => word(sc, sent, text, nth).start;
export const end = (sc, sent, text, nth) => word(sc, sent, text, nth).end;
export const sent = (sc, i) => cues.sentences.find((x) => x.scene === sc && x.idx === i);
