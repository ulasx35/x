// Every animation beat of episode 4, locked to the words of the voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — a page that never opens
  tik: at('hook', 0, 'tıkladınız'), acil: at('hook', 1, 'açılıyor'), acil2: at('hook', 1, 'açılıyor', 1), bembeyaz: at('hook', 1, 'bembeyaz'),
  kac: at('hook', 2, 'kaç'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'Dördüncü'), tKuyruk: at('title', 1, 'kuyruk'), titleEnd: scene('title').end,
  // bridge — address, building, road, lock and mailbox are ready; now a queue at the door
  b0: at('bridge', 0, 'Sitenizin'), bAdres: at('bridge', 0, 'adresi'), bBina: at('bridge', 0, 'binası'), bYol: at('bridge', 0, 'yolu'),
  bKilit: at('bridge', 0, 'kilidi'), bPosta: at('bridge', 0, 'posta'), bPeki: at('bridge', 1, 'Peki'), bKuyruk: at('bridge', 1, 'kuyruk'),
  bEnd: scene('bridge').end,
  // 01 the queue
  w0: at('what', 0, 'Telefondan'), wYari: at('what', 0, 'yarısından'), wUc: at('what', 0, 'üç'), wKapat: at('what', 0, 'kapatır'),
  wYavas: at('what', 1, 'Yavaş'), wKuyruk: at('what', 1, 'kuyruk'), wDukkan: at('what', 1, 'dükkan'),
  wMusteri: at('what', 2, 'Müşteri'), wSonra: at('what', 2, 'sonra'), wYan: at('what', 2, 'yan'),
  wGoogle: at('what', 3, 'Google'), wOne: at('what', 3, 'öne'), wEnd: scene('what').end,
  // 02 the causes: heavy images, a crowded server
  i0: at('image', 0, 'Peki'), iSebep: at('image', 1, 'sebep'), iGorsel: at('image', 1, 'büyük'), iFoto: at('image', 2, 'fotoğraf'),
  iAgir: at('image', 2, 'ağır'), iKucuk: at('image', 3, 'küçültülüp'), iSikis: at('image', 3, 'sıkıştırılınca'), iHizli: at('image', 3, 'hızlı'),
  iEnd: scene('image').end,
  h0: at('hosting', 0, 'İkinci'), hHost: at('hosting', 0, 'hosting'), hUcuz: at('hosting', 1, 'Ucuz'), hYuz: at('hosting', 1, 'yüzlerce'),
  hPay: at('hosting', 1, 'paylaşır'), hBina: at('hosting', 2, 'Bina'), hKapi: at('hosting', 2, 'kapı'), hKuyruk: at('hosting', 2, 'kuyruk'),
  hKalite: at('hosting', 3, 'Kaliteli'), hGenis: at('hosting', 3, 'geniş'), hAcar: at('hosting', 3, 'açar'), hEnd: scene('hosting').end,
  // 03 the fix: branches everywhere, then measure
  c0: at('cdn', 0, 'Peki'), cUzak: at('cdn', 0, 'uzaktaysa'), cCdn: at('cdn', 1, 'CDN'), cKopya: at('cdn', 2, 'kopyalarını'),
  cSehir: at('cdn', 2, 'şehirlerdeki'), cDagit: at('cdn', 2, 'dağıtır'), cHerkes: at('cdn', 3, 'herkes'), cYakin: at('cdn', 3, 'yakın'),
  cSube: at('cdn', 3, 'şubeden'), cEnd: scene('cdn').end,
  x0: at('test', 0, 'İyi'), xOlc: at('test', 0, 'ölçebilirsiniz'), xGoogle: at('test', 1, "Google'ın"), xAdres: at('test', 1, 'adresinizi'),
  xPuan: at('test', 2, 'Puanınızı'), xNeyin: at('test', 2, 'neyin'), xGor: at('test', 2, 'görürsünüz'), xEnd: scene('test').end,
  // recap = glossary card, then save, next episode, end frame
  r0: at('recap', 0, 'Kısacası'), gYavas: at('recap', 0, 'Yavaş'), gHafif: at('recap', 1, 'Hafif'), gHost: at('recap', 1, 'hosting'),
  gCdn: at('recap', 1, 'CDN'), rEnd: scene('recap').end,
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), yedek: at('outro', 1, 'yedek'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
