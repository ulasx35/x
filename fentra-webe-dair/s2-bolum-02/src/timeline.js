// Every animation beat of season 2, episode 2, locked to the words of the voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — your site says one thing, the customer types another
  h0: at('hook', 0, 'Sitenizde'), hKurumsal: at('hook', 0, 'kurumsal'), hMus: at('hook', 1, 'Müşteriniz'), hEvden: at('hook', 1, 'evden'),
  hYaziyor: at('hook', 1, 'yazıyor'), hAyni: at('hook', 2, 'Aynı'), hDil: at('hook', 2, 'dili'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'İkinci'), tKelime: at('title', 1, 'kelimeleri'), titleEnd: scene('title').end,
  // bridge — the guide; the right words
  b0: at('bridge', 0, 'Geçen'), bRehber: at('bridge', 0, 'rehberi'), bSimdi: at('bridge', 1, 'Şimdi'), bDogru: at('bridge', 1, 'doğru'), bEnd: scene('bridge').end,
  // 01 the keyword: what the customer types; matched against the book; yours doesn't match
  w0: at('what', 0, 'Anahtar'), wYaz: at('what', 0, 'yazdığı'), wRehber: at('what', 1, 'Rehber'), wEsle: at('what', 1, 'eşleştirir'),
  wYoksa: at('what', 2, 'yoksa'), wOne: at('what', 2, 'öne'), wEnd: scene('what').end,
  // the customer's language
  l0: at('lang', 0, 'O'), lMus: at('lang', 0, 'müşterinin'), lYaz: at('lang', 0, 'yazın'), lImplant: at('lang', 1, 'implant'), lEksik: at('lang', 1, 'eksik'),
  lEnd: scene('lang').end,
  // 02 research: suggestions, related searches, asking customers
  f0: at('find', 0, 'Peki'), fKolay: at('find', 1, 'kolay'), fKutu: at('find', 2, 'Arama'), fOneri: at('find', 2, 'önerilere'), fBenzer: at('find', 3, 'benzer'),
  fIpucu: at('find', 3, 'ipucu'), fSor: at('find', 4, 'sorun'), fNasil: at('find', 4, 'Bizi'), fEnd: scene('find').end,
  // long searches
  n0: at('long', 0, 'Tek'), nRakip: at('long', 0, 'rakip'), nYalniz: at('long', 1, 'Yalnızca'), nBak: at('long', 1, 'bakınıyor'), nKarsi: at('long', 2, "Karşıyaka'da"),
  nFiyat: at('long', 2, 'fiyatı'), nTasin: at('long', 2, 'taşınmak'), nUzun: at('long', 3, 'Uzun'), nAz: at('long', 3, 'azdır'), nKarar: at('long', 3, 'karar'),
  nEnd: scene('long').end,
  // 03 one topic per page; where the word goes; stuffing doesn't work
  p0: at('page', 0, 'Her'), pTek: at('page', 0, 'tek'), pEvden: at('page', 1, 'Evden'), pOfis: at('page', 1, 'ofis'), pBaslik: at('page', 2, 'başlığında'),
  pIlk: at('page', 2, 'ilk'), pMetin: at('page', 2, 'metninde'), pDogal: at('page', 2, 'doğal'), pAyni: at('page', 3, 'Aynı'), pYirmi: at('page', 3, 'yirmi'),
  pFark: at('page', 3, 'fark'), pEnd: scene('page').end,
  // recap
  x0: at('recap', 0, 'Kısacası'), xDil: at('recap', 0, 'dilidir'), xNasil: at('recap', 1, 'nasıl'), xKonus: at('recap', 1, 'konuşsun'), xEnd: scene('recap').end,
  // save the card, next episode, end frame
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), nVitrin: at('outro', 1, 'vitrindeki'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
