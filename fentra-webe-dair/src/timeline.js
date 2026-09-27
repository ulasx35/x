// Every animation beat, locked to the words of the recorded voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — a search, a tap, a page in under a second; then we dive behind the screen
  type0: at('hook', 0, 'Google'), type1: end('hook', 0, 'yazarsınız'),
  results: at('hook', 1, 'Bir'), tap: at('hook', 1, 'dokunursunuz') + 0.3, pageOpen: at('hook', 1, 'açılır'),
  sec: at('hook', 2, 'saniye'), dive0: at('hook', 3, 'Ama'), perde: at('hook', 3, 'perde'), three: at('hook', 3, 'üç'),
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'Birinci'),
  tAdres: at('title', 1, 'adres'), tBina: at('title', 1, 'bina'), tYol: at('title', 1, 'yol'), titleEnd: scene('title').end,
  // 01 domain
  d1: at('domain', 0, 'Birincisi'), dTerm: at('domain', 0, 'domain'), dAlan: at('domain', 0, 'alan'),
  dGoogle: at('domain', 1, 'Google'), dBar: at('domain', 1, 'adres'), dName: at('domain', 1, 'websiteniz'),
  dShop: at('domain', 2, 'Dükkanınızın'), dSite: at('domain', 2, 'sitenizin'), dEnd: scene('domain').end,
  // 02 hosting
  h2: at('hosting', 0, 'İkincisi'), hTerm: at('hosting', 0, 'hosting'),
  hYazi: at('hosting', 1, 'yazılar'), hFoto: at('hosting', 1, 'fotoğraflar'), hMenu: at('hosting', 1, 'menünüz'),
  hAll: at('hosting', 2, 'Hepsi'), hGece: at('hosting', 2, 'gece'), hGunduz: at('hosting', 2, 'gündüz'), hPc: at('hosting', 2, 'özel'),
  hSunucu: at('hosting', 3, 'Bunlara'), hRent0: at('hosting', 4, 'Hosting'), hRent: at('hosting', 4, 'kiraladığınız'),
  hBina: at('hosting', 5, 'Yani'), hBinaW: at('hosting', 5, 'bina'), hEnd: scene('hosting').end,
  // IP
  i0: at('ip', 0, 'Peki'), iSorun: at('ip', 1, 'Burada'), iNames: at('ip', 2, 'isimleri'), iNums: at('ip', 2, 'numaraları'),
  iEvery: at('ip', 3, 'Her'), iIP: at('ip', 3, 'IP'), iEnd: scene('ip').end,
  // 03 DNS
  n3: at('dns', 0, 'İşte'), nTerm: at('dns', 0, 'DNS'), nBook: at('dns', 1, 'Telefon'), nTap: at('dns', 2, 'dokunursunuz'),
  nMemo: at('dns', 2, 'numarayı'), nFind: at('dns', 2, 'telefon'), nDns: at('dns', 3, 'DNS'), nConv: at('dns', 3, 'numaraya'),
  nGo: at('dns', 3, 'sizi'), nArrive: end('dns', 3, 'götürür'),
  // moving to a new hosting
  m0: at('move', 0, "Hosting'inizi"), mSame: at('move', 0, 'adresiniz'), mOnly: at('move', 1, 'Sadece'), mNum: at('move', 1, 'numara'),
  mUpd: at('move', 1, 'güncellenir'), mWave: at('move', 2, 'Bunun'), mHours: at('move', 2, 'birkaç'), mEnd: scene('move').end,
  // recap
  r0: at('recap', 0, 'Şimdi'), rType: at('recap', 1, 'Adresi'), rDns: at('recap', 1, 'DNS'), rHost: at('recap', 1, 'hosting'),
  rOpen: at('recap', 1, 'açar'), rEnd: scene('recap').end,
  // outro
  o0: at('outro', 0, 'İşte'), gDomain: at('outro', 1, 'Domain'), gHosting: at('outro', 1, 'hosting'), gDns: at('outro', 1, 'DNS'),
  save: at('outro', 2, 'Bu'), next: at('outro', 3, 'Sıradaki'), lock: at('outro', 3, 'kapınızdaki'),
  endCard: at('outro', 4, "Web'e"), fentra: at('outro', 4, "Fentra'yla"), END: DURATION,
};
