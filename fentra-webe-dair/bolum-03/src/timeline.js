// Every animation beat of episode 3, locked to the words of the recorded voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — an offer from a personal address
  geldi: at('hook', 0, 'geldi'), gonderen: at('hook', 1, 'gönderen'), gmail: at('hook', 1, 'Gmail'), guven: at('hook', 2, 'güvenirsiniz'),
  hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'Üçüncü'), tPosta: at('title', 1, 'posta'), titleEnd: scene('title').end,
  // bridge — address, building, road and lock are ready; now the mailbox
  b0: at('bridge', 0, 'Sitenizin'), bAdres: at('bridge', 0, 'adresi'), bBina: at('bridge', 0, 'binası'), bYol: at('bridge', 0, 'yolu'),
  bKilit: at('bridge', 0, 'kilidi'), bSira: at('bridge', 1, 'Sıra'), bPosta: at('bridge', 1, 'posta'), bEnd: scene('bridge').end,
  // 01 the address
  w0: at('what', 0, 'Kurumsal'), wAlan: at('what', 0, 'alan'), wOrnek: at('what', 1, 'Örneğin'), wAdr: at('what', 1, 'bilgi'),
  wMusteri: at('what', 2, 'Müşteri'), wGercek: at('what', 2, 'gerçek'), wEnd: scene('what').end,
  tKisisel: at('trust', 0, 'Kişisel'), tHerkes: at('trust', 0, 'herkes'), tDolan: at('trust', 1, 'Dolandırıcılar'), tAma: at('trust', 2, 'Ama'),
  tSiz: at('trust', 2, 'siz'), tKurumsal: at('trust', 3, 'Kurumsal'), tImza: at('trust', 3, 'imzasıdır'), tEnd: scene('trust').end,
  // 02 the seal
  s0: at('seal', 0, 'Peki'), sSahte: at('seal', 0, 'sahte'), sRehber: at('seal', 1, 'rehberine'), sDns: at('seal', 1, "DNS'e"),
  sSpf: at('seal', 1, 'SPF'), sDkim: at('seal', 1, 'DKIM'), sDmarc: at('seal', 1, 'DMARC'), sBunlar: at('seal', 2, 'Bunlar'),
  sMuhur: at('seal', 2, 'mühürlerdir'), sEnd: scene('seal').end,
  pYoksa: at('spam', 0, 'Bu'), pTeklif: at('spam', 0, 'teklifler'), pSpam: at('spam', 0, 'spam'), pDus: at('spam', 0, 'düşebilir'), pEnd: scene('spam').end,
  // 03 setting it up
  u0: at('setup', 0, 'İyi'), uHosting: at('setup', 0, 'hosting'), uSatis: at('setup', 1, 'Satış'), uMuhasebe: at('setup', 1, 'muhasebe'),
  uDestek: at('setup', 1, 'destek'), uEnd: scene('setup').end,
  x0: at('expire', 0, 'Unutmayın'), xSure: at('expire', 0, 'süresi'), xDur: at('expire', 0, 'durur'), xEnd: scene('expire').end,
  // recap = glossary card, then save, next episode, end frame
  r0: at('recap', 0, 'Kısacası'), gPosta: at('recap', 0, 'Kurumsal'), gSpf: at('recap', 1, 'SPF'), rEnd: scene('recap').end,
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), kuyruk: at('outro', 1, 'kuyruk'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
