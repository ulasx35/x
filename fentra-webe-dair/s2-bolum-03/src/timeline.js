// Every animation beat of season 2, episode 3, locked to the words of the voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — ten shop windows side by side; two lines each; what does yours say?
  v0: at('hook', 0, 'Arama'), vOn: at('hook', 0, 'on'), vYan: at('hook', 0, 'yan'), vMus: at('hook', 1, 'Müşteri'), vIki: at('hook', 1, 'iki'),
  vSec: at('hook', 1, 'seçer'), vSizin: at('hook', 2, 'Sizin'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'İkinci'), tVitrin: at('title', 1, 'vitrindeki'), titleEnd: scene('title').end,
  // bridge
  b0: at('bridge', 0, 'Müşterinin'), bBul: at('bridge', 0, 'bulduk'), bSimdi: at('bridge', 1, 'Şimdi'), bVitrin: at('bridge', 1, 'vitrine'), bEnd: scene('bridge').end,
  // 01 the shop window: a blue title and a short description
  w0: at('what', 0, 'Arama'), wIki: at('what', 0, 'iki'), wMavi: at('what', 0, 'mavi'), wKisa: at('what', 0, 'kısa'), wAcik: at('what', 0, 'açıklama'),
  wBu: at('what', 1, 'Bu'), wVitrin: at('what', 1, 'vitrinidir'), wMus: at('what', 2, 'Müşteri'), wYalniz: at('what', 2, 'yalnızca'), wEnd: scene('what').end,
  // a window that says "Anasayfa"
  d0: at('bad', 0, 'Birçok'), dAna: at('bad', 0, 'anasayfa'), dAcik: at('bad', 1, 'Açıklama'), dBos: at('bad', 1, 'boştur'), dRast: at('bad', 1, 'rastgele'),
  dBoyle: at('bad', 2, 'Böyle'), dGecer: at('bad', 2, 'geçer'), dEnd: scene('bad').end,
  // 02 a good title
  t0: at('titl', 0, 'İyi'), tNe: at('titl', 0, 'ne'), tNerede: at('titl', 0, 'nerede'), tOrn: at('titl', 1, 'Örneğin'), tKarsi: at('titl', 1, "Karşıyaka'da"),
  tSigorta: at('titl', 1, 'sigortalı'), tEn: at('titl', 2, 'En'), tBasa: at('titl', 2, 'başa'), tAltmis: at('titl', 2, 'altmış'), tUzun: at('titl', 3, 'Daha'),
  tKesil: at('titl', 3, 'kesilir'), tEnd: scene('titl').end,
  // 03 a good description
  a0: at('desc', 0, 'Açıklama'), aNot: at('desc', 0, 'nottur'), aNeden: at('desc', 1, 'neden'), aKesif: at('desc', 1, 'keşif'), aGun: at('desc', 1, 'gün'),
  aTel: at('desc', 1, 'telefonla'), aYuz: at('desc', 2, 'yüz'), aGoogle: at('desc', 3, 'Google'), aKendi: at('desc', 3, 'kendisi'), aIyi: at('desc', 3, 'iyi'),
  aSizin: at('desc', 3, 'sizinkini'), aEnd: scene('desc').end,
  // a different pair for every page; where to change them
  p0: at('pages', 0, 'Her'), pFark: at('pages', 0, 'farklı'), pPanel: at('pages', 1, 'yönetim'), pAyar: at('pages', 1, 'ayarlarından'), pEnd: scene('pages').end,
  // recap
  x0: at('recap', 0, 'Kısacası'), xDur: at('recap', 0, 'durdurur'), xDavet: at('recap', 0, 'davet'), xEnd: scene('recap').end,
  // save the card, next episode, end frame
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), nDukkan: at('outro', 1, 'dükkanın'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
