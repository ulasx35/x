// Every animation beat of episode 5, locked to the words of the voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — the site is gone
  sabah: at('hook', 0, 'sabah'), sayfalar: at('hook', 1, 'Sayfalar'), urunler: at('hook', 1, 'ürünler'), yillarca: at('hook', 1, 'yıllarca'),
  gitmis: at('hook', 1, 'gitmiş'), yedeginiz: at('hook', 2, 'Yedeğiniz'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'Beşinci'), tAnahtar: at('title', 1, 'anahtar'), titleEnd: scene('title').end,
  // bridge — the site is ready, fast and safe; but what if the building falls? (the pins of earlier episodes light up on "hazır")
  b0: at('bridge', 0, 'Siteniz'), bHazir: at('bridge', 0, 'hazır'), bHizli: at('bridge', 0, 'hızlı'), bGuven: at('bridge', 0, 'güvende'),
  bPeki: at('bridge', 1, 'Peki'), bCok: at('bridge', 1, 'çökerse'), bEnd: scene('bridge').end,
  // 01 the crash
  c0: at('crash', 0, 'Siteler'), cSunucu: at('crash', 1, 'Sunucu'), cGuncel: at('crash', 1, 'güncelleme'), cKotu: at('crash', 1, 'kötü'),
  cSizar: at('crash', 1, 'sızar'), cBazen: at('crash', 2, 'Bazen'), cDosya: at('crash', 2, 'dosyayı'), cSil: at('crash', 2, 'silersiniz'),
  cEnd: scene('crash').end,
  // 02 the backup
  k0: at('backup', 0, 'Yedek'), kKopya: at('backup', 0, 'kopyasıdır'), kDosya: at('backup', 0, 'dosyalar'), kGorsel: at('backup', 0, 'görseller'),
  kVeri: at('backup', 0, 'veritabanı'), kKasa: at('backup', 1, 'kasada'), kAnahtar: at('backup', 1, 'anahtar'), kOlur: at('backup', 2, 'olursa'),
  kGeri: at('backup', 2, 'geri'), kDakika: at('backup', 2, 'dakikalar'), kEski: at('backup', 2, 'eski'), kEnd: scene('backup').end,
  o0: at('offsite', 0, 'Ama'), oAyni: at('offsite', 0, 'aynı'), oYan: at('offsite', 1, 'yanarsa'), oKasa: at('offsite', 1, 'kasa'),
  oBaska: at('offsite', 2, 'başka'), oBulut: at('offsite', 2, 'bulutta'), oEnd: scene('offsite').end,
  a0: at('auto', 0, 'En'), aHer: at('auto', 0, 'her'), aKendi: at('auto', 0, 'kendiliğinden'), aDene: at('auto', 1, 'geri'),
  aDeneyin: at('auto', 1, 'deneyin'), aDenen: at('auto', 2, 'Denenmemiş'), aKilide: at('auto', 2, 'kilide'), aUymayan: at('auto', 2, 'uymayan'),
  aEnd: scene('auto').end,
  // 03 updates
  u0: at('update', 0, 'İkinci'), uGunc: at('update', 0, 'güncellemeler'), uYazilim: at('update', 1, 'yazılımı'), uEski: at('update', 1, 'eski'),
  uKorunur: at('update', 1, 'korunur'), uSaldir: at('update', 2, 'Saldırganlar'), uEskiK: at('update', 2, 'eski'), uErtele: at('update', 3, 'ertelemeyin'),
  uOnce: at('update', 3, 'önce'), uYedek: at('update', 3, 'yedek'), uEnd: scene('update').end,
  h0: at('host', 0, 'İyi'), hOto: at('host', 0, 'otomatik'), hVar: at('host', 1, 'var'), hSik: at('host', 1, 'sıklıkla'),
  hNerede: at('host', 1, 'nerede'), hUc: at('host', 2, 'üç'), hEnd: scene('host').end,
  // recap = glossary card, then save, next episode, end frame
  r0: at('recap', 0, 'Kısacası'), gYedek: at('recap', 0, 'Yedek'), gGunc: at('recap', 1, 'Güncelleme'), rEnd: scene('recap').end,
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), harita: at('outro', 1, 'haritadaki'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
// the five pins of earlier episodes light up in a quick cascade on "hazır"; "Kuyruk yok" on "hızlı"; the lock pulses on "güvende"
Object.assign(T, { bAdres: T.bHazir - 0.2, bBina: T.bHazir + 0.05, bYol: T.bHazir + 0.3, bPosta: T.bHazir + 0.55, bKuyruk: T.bHizli, bKilit: T.bGuven });
