// Every animation beat of season 2, episode 1, locked to the words of the voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — a search, ten results in under a second; how were they picked?
  yaz: at('hook', 0, 'en'), dis: at('hook', 0, 'diş'), yazdi: at('hook', 0, 'yazdı'), saniye: at('hook', 1, 'saniye'), on: at('hook', 1, 'on'),
  cikti: at('hook', 1, 'çıktı'), milyon: at('hook', 2, 'milyonlarca'), nasil: at('hook', 2, 'nasıl'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'İkinci'), tRehber: at('title', 1, 'rehberi'), titleEnd: scene('title').end,
  // bridge — last season we built it; this season we bring it forward
  b0: at('bridge', 0, 'Geçen'), bKur: at('bridge', 0, 'kurduk'), bBu: at('bridge', 1, 'Bu'), bOne: at('bridge', 1, 'öne'), bEnd: scene('bridge').end,
  // the guide who knows every building; three steps
  g0: at('guide', 0, "Google'ı"), gHer: at('guide', 0, 'her'), gRehber: at('guide', 0, 'rehber'), gSor: at('guide', 1, 'Ona'), gAdres: at('guide', 1, 'adresleri'),
  gUc: at('guide', 2, 'üç'), gEnd: scene('guide').end,
  // 01 crawling
  c0: at('crawl', 0, 'Birinci'), cGez: at('crawl', 1, 'gezginleri'), cDolas: at('crawl', 1, 'dolaşır'), cSayfa: at('crawl', 2, 'Bir'),
  cBag: at('crawl', 2, 'bağlantıları'), cHic: at('crawl', 3, 'Hiçbir'), cBulamaz: at('crawl', 3, 'bulamaz'), cEnd: scene('crawl').end,
  // 02 the index
  i0: at('index', 0, 'İkinci'), iOkur: at('index', 1, 'okur'), iDefter: at('index', 1, 'kayıt'), iEkler: at('index', 1, 'ekler'),
  iArama: at('index', 2, 'Siz'), iBakmaz: at('index', 2, 'bakmaz'), iDeftere: at('index', 2, 'deftere'), iOlmayan: at('index', 3, 'Defterde'),
  iCikmaz: at('index', 3, 'çıkmaz'), iEnd: scene('index').end,
  // 03 ranking
  r0: at('rank', 0, 'Üçüncü'), rOne: at('rank', 1, 'öne'), rUygun: at('rank', 1, 'konuya'), rGuven: at('rank', 1, 'güvenilir'), rHizli: at('rank', 1, 'hızlı'),
  rTel: at('rank', 1, 'telefonda'), rIlk: at('rank', 2, 'İlk'), rCadde: at('rank', 2, 'caddesidir'), rIkinci: at('rank', 3, 'İkinci'), rKimse: at('rank', 3, 'kimse'),
  rEnd: scene('rank').end,
  // check: a site: search
  k0: at('check', 0, 'Siteniz'), kKutu: at('check', 1, 'arama'), kSite: at('check', 1, 'site'), kNokta: at('check', 1, 'iki'), kAdres: at('check', 1, 'adresini'),
  kCikan: at('check', 2, 'Çıkan'), kEnd: scene('check').end,
  // recap: finds, records, ranks; SEO
  x0: at('recap', 0, 'Kısacası'), xGez: at('recap', 0, 'Gezgin'), xDef: at('recap', 0, 'defter'), xReh: at('recap', 0, 'rehber'), xSeo: at('recap', 1, 'SEO'),
  xEnd: scene('recap').end,
  // save the card, next episode, end frame
  save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'), nKelime: at('outro', 1, 'kelimeleri'),
  endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"), END: DURATION,
};
