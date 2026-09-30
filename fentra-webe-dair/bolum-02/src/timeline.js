// Every animation beat of episode 2, locked to the words of the recorded voice-over (see cues.js).
import { at, end, scene, DURATION } from './anim.js';

export const T = {
  // hook — a "Not secure" warning on a payment page
  bar: at('hook', 1, 'Adres'), red: at('hook', 1, 'kırmızı'), warn: at('hook', 1, 'Güvenli'), kart: at('hook', 2, 'kart'),
  girer: at('hook', 2, 'girer'), hookEnd: scene('hook').end,
  // title
  title: at('title', 0, "Web'e"), ep: at('title', 1, 'İkinci'), tKilit: at('title', 1, 'kilit'), titleEnd: scene('title').end,
  // bridge — last episode's address, building and road; today the lock
  b0: at('bridge', 0, 'Geçen'), bAdres: at('bridge', 0, 'adresini'), bBina: at('bridge', 0, 'binasını'), bYol: at('bridge', 0, 'yolunu'),
  bBugun: at('bridge', 1, 'Bugün'), bKilit: at('bridge', 1, 'kilit'), bEnd: scene('bridge').end,
  // 01 HTTP — a postcard anyone can read
  h0: at('http', 0, 'Bir'), hTel: at('http', 0, 'telefonunuzla'), hSunucu: at('http', 0, 'sunucu'), hTasin: at('http', 0, 'taşınır'),
  hHttp: at('http', 1, 'HTTP'), hKart: at('http', 1, 'kartpostal'), hKafe: at('http', 2, 'kafedeki'), hWifi: at('http', 2, "Wi-Fi'da"),
  hSifre: at('http', 2, 'şifreyi'), hOku: at('http', 2, 'başkası'), hEnd: scene('http').end,
  // 02 HTTPS — a locked box
  s0: at('https', 0, 'HTTPS'), sKutu: at('https', 0, 'kilitli'), sKoyar: at('https', 0, 'koyar'), sS: at('https', 1, 'S', 1),
  sGuvenli: at('https', 1, 'güvenli'), sAnahtar: at('https', 2, 'anahtarı'), sTarayici: at('https', 2, 'tarayıcınızda'),
  sSunucu: at('https', 2, 'sunucusunda'), sYolda: at('https', 3, 'Yolda'), sGecir: at('https', 3, 'geçirse'),
  sAnlamsiz: at('https', 3, 'anlamsız'), sEnd: scene('https').end,
  // 03 the certificate — the site's ID card
  c0: at('cert', 0, 'Peki'), cIste: at('cert', 1, 'İşte'), cSSL: at('cert', 1, 'SSL'), cKimlik: at('cert', 2, 'kimlik'),
  cKurum: at('cert', 2, 'kurum'), cVerilir: at('cert', 2, 'verilir'), cKontrol: at('cert', 3, 'kontrol'), cGecerli: at('cert', 3, 'Geçerli'),
  cAdres: at('cert', 3, 'adrese'), cSure: at('cert', 3, 'süresi'), cHer: at('cert', 4, 'Her'), cKapi: at('cert', 4, 'kapıya'),
  cKilit: at('cert', 4, 'kilit'), cEnd: scene('cert').end,
  // without a certificate
  w0: at('without', 0, 'Sertifika'), wUyar: at('without', 0, 'uyarır'), wWarn: at('without', 0, 'Güvenli'), wCogu: at('without', 1, 'Çoğu'),
  wGeri: at('without', 1, 'geri'), wGoogle: at('without', 2, 'Google'), wEnd: scene('without').end,
  // the good news
  p0: at('tip', 0, 'İyi'), pHosting: at('tip', 0, 'hosting'), pUcretsiz: at('tip', 0, 'ücretsiz'), pYeniler: at('tip', 0, 'kendiliğinden'),
  pAdres: at('tip', 1, 'Adres'), pWarn: at('tip', 1, 'Güvenli'), pKilitli: at('tip', 1, 'kilitli'), pEnd: scene('tip').end,
  // recap = glossary card, then save, next episode, end frame
  r0: at('recap', 0, 'Kısacası'), gHttp: at('recap', 0, 'HTTP'), gHttps: at('recap', 0, 'HTTPS'), gSsl: at('recap', 1, 'SSL'),
  rEnd: scene('recap').end, save: at('outro', 0, 'Bu'), saveW: at('outro', 0, 'kaydedin'), next: at('outro', 1, 'Sıradaki'),
  posta: at('outro', 1, 'posta'), eposta: at('outro', 1, 'e-posta'), endCard: at('outro', 2, "Web'e"), fentra: at('outro', 2, "Fentra'yla"),
  END: DURATION,
};
