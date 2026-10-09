// Every animation beat of episode 6 (season finale), locked to the words of the voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — a search on the map, three businesses, not yours
  yakin: at('hook', 0, 'yakınımdaki'), yazdi: at('hook', 0, 'yazdı'), uc: at('hook', 1, 'üç'), yildiz: at('hook', 1, 'yıldızlarıyla'),
  tarif: at('hook', 1, 'tarifiyle'), sizin: at('hook', 2, 'Sizin'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'Altıncı'), tHarita: at('title', 1, 'haritadaki'), titleEnd: scene('title').end,
  // bridge — ready, fast and safe; but customers look on the map first
  b0: at('bridge', 0, 'Siteniz'), bHazir: at('bridge', 0, 'hazır'), bHizli: at('bridge', 0, 'hızlı'), bGuven: at('bridge', 0, 'güvende'),
  bAma: at('bridge', 1, 'Ama'), bHarita: at('bridge', 1, 'haritada'), bEnd: scene('bridge').end,
  // 01 the card
  k0: at('card', 0, 'Google'), kKart: at('card', 0, 'kartıdır'), kArama: at('card', 1, 'Aramada'), kAdres: at('card', 1, 'adresiniz'),
  kSaat: at('card', 1, 'çalışma'), kTel: at('card', 1, 'telefonunuz'), kFoto: at('card', 1, 'fotoğraflarınız'), kYorum: at('card', 1, 'yorumlarınız'),
  kHepsi: at('card', 1, 'hepsi'), kEnd: scene('card').end,
  w0: at('why', 0, 'Yakınında'), wKarar: at('why', 0, 'karar'), wKarti: at('why', 1, 'Kartı'), wGorunmez: at('why', 1, 'görünmez'),
  wMusteri: at('why', 2, 'Müşteri'), wDukkan: at('why', 2, 'dükkana'), wEnd: scene('why').end,
  // 02 setting it up
  s0: at('setup', 0, 'Kurmak'), sEkler: at('setup', 1, 'İşletmenizi'), sDogru: at('setup', 1, 'doğrularsınız'), sSonra: at('setup', 2, 'Sonra'),
  sAdres: at('setup', 2, 'adres'), sSaat: at('setup', 2, 'saat'), sTel: at('setup', 2, 'telefon'), sSite: at('setup', 2, 'sitenizin'),
  sBu: at('setup', 3, 'Bu'), sAyni: at('setup', 3, 'aynı'), sEnd: scene('setup').end,
  // 03 trust: reviews and hours
  v0: at('reviews', 0, 'Yorumlar'), vVitrin: at('reviews', 0, 'vitrininizin'), vMemnun: at('reviews', 1, 'Memnun'), vIste: at('reviews', 1, 'isteyin'),
  vCevap: at('reviews', 1, 'cevap'), vOlumsuz: at('reviews', 1, 'olumsuz'), vGuven: at('reviews', 2, 'güven'), vEnd: scene('reviews').end,
  h0: at('hours', 0, 'Bayramda'), hDegis: at('hours', 0, 'değişti'), hGunc: at('hours', 1, 'güncelleyin'), hYanlis: at('hours', 2, 'Yanlış'),
  hKapi: at('hours', 2, 'kapıda'), hGelmez: at('hours', 2, 'gelmez'), hEnd: scene('hours').end,
  // recap: the pin, then the whole season lights up; save the season card, next season, end frame
  r0: at('recap', 0, 'Kısacası'), gIgne: at('recap', 0, 'iğneniz'), gSezon: at('recap', 1, 'sezonun'), gTamam: at('recap', 1, 'tamam'), rEnd: scene('recap').end,
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), nSeo: at('outro', 1, 'SEO'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
// the pins of earlier episodes light up in a quick cascade on "hazır"; "Kuyruk yok" on "hızlı"; the lock pulses on "güvende"
Object.assign(T, { bAdres: T.bHazir - 0.2, bBina: T.bHazir + 0.05, bYol: T.bHazir + 0.3, bPosta: T.bHazir + 0.55, bKuyruk: T.bHizli, bKilit: T.bGuven });
