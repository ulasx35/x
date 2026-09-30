// Episode 2 overlays: the phone, the "GERÇEKTE" card, term cards, chapter bar, labels pinned to the city,
// the magnifier's lens, captions, title, glossary and end frame. Pure function of time.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outExpo, outQuint, win } from './anim.js';
import { T } from './timeline.js';

const P = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  warn: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  postcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M13 9.5h5M13 12.5h5M13 15.5h3"/><rect x="6" y="9" width="4" height="4"/>',
  box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h5M14 13h4"/>',
  key: '<circle cx="7.5" cy="15.5" r="3.5"/><path d="M10 13L19 4M15.5 7.5l2.5 2.5M13.5 9.5l2 2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  wifi: '<path d="M2.5 8.5a14 14 0 0 1 19 0M5.5 12a9.5 9.5 0 0 1 13 0M8.5 15.3a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="0.8"/>',
  sign: '<path d="M12 3v18M5 6h12l2 2.5-2 2.5H5zM8 21h8"/>',
  building: '<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  seal: '<circle cx="12" cy="9" r="6"/><path d="M9 14.5L7.5 21l4.5-2.5 4.5 2.5-1.5-6.5"/><path d="M9.5 9l1.8 1.8L14.5 7.5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };
const blink = (t) => (Math.floor(t * 2.2) % 2 === 0 ? 1 : 0.15);
const GIB = 'x9#fK2@q&7Lm$Zp4!Rv8';
const gib = (t, n) => { let s = ''; for (let i = 0; i < n; i++) s += GIB[(i * 7 + Math.floor(t * 18) * 3 + i * i) % GIB.length]; return s; };

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;

  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');

  // ---------------------------------------------------------------- phone (hook): a payment page that is "not secure"
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer" style="background:#f7f8fb">
      <div style="position:absolute;left:0;right:0;top:0;height:176px;background:#e7ebf3"></div>
      <div class="addr" id="pAddr" style="position:absolute;left:22px;right:22px;top:96px;height:62px;font-size:21px;gap:10px;padding:0 16px">
        <span class="nsec" id="pWarn">${ic('warn')}Güvenli değil</span><span style="color:#6b7487">websiteniz.com</span></div>
      <div class="pay">
        <div class="pay-h">Ödeme</div><div class="pay-s">Siparişiniz: 2 ürün · <b>1.249,90 TL</b></div>
        <div class="lbl">Kart numarası</div><div class="fld" id="pCard"><span id="pCardTxt"></span><i class="caret" id="pCaret"></i></div>
        <div class="row2"><div><div class="lbl">Son kullanma</div><div class="fld">AA / YY</div></div><div><div class="lbl">CVC</div><div class="fld">•••</div></div></div>
        <div class="paybtn">Ödemeyi tamamla</div>
      </div>
      <div class="ripple" id="pTap"></div>
    </div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const warnBig = add(`<div id="warnBig">${ic('warn')}<span>Güvenli değil</span></div>`);
  const qBubble = add('<div id="qBubble">?</div>');

  // ---------------------------------------------------------------- the GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mForm">
      <div class="browser" style="bottom:auto;height:392px"><div class="chrome"><div class="addr" id="fAddr" style="font-size:22px;gap:10px;padding:0 16px">
        <span class="nsec" id="fWarn">${ic('warn')}Güvenli değil</span><span class="sec" id="fLock">${ic('lock')}</span><span id="fUrl">http://websiteniz.com</span></div></div>
        <div style="padding:20px 26px 0">
          <div class="lbl" style="color:#4d5566">Kullanıcı adı</div><div class="fld sm">websiteniz</div>
          <div class="lbl" style="color:#4d5566;margin-top:12px">Şifre</div><div class="fld sm" id="fPass"><span id="fPassTxt"></span><i class="caret" id="fCaret"></i></div>
        </div></div>
      <div class="wire" id="wire"><div class="wh">${ic('eye')}<span id="wireH">YOLDA GİDEN BİLGİ</span></div><div class="wv" id="wireV"></div></div>
      <div class="keys" id="keys"><div id="k1">${ic('key')}<span>Tarayıcınız</span></div><div class="kline"></div><div id="k2">${ic('key')}<span>Sunucu</span></div></div>
    </div>
    <div class="mode" id="mCert"><div class="idc" id="idc">
      <div class="idh">${ic('seal')}<span>SSL SERTİFİKASI</span></div>
      <div class="idb"><div class="idp">W</div><div class="idf">
        <div><small>ALAN ADI</small><b class="mono">websiteniz.com</b></div>
        <div><small>VEREN</small><b>Güvenilir sertifika kurumu</b></div>
        <div><small>GEÇERLİLİK</small><b class="mono">01.10.2026 – 30.12.2026</b></div></div></div>
      <div class="stamp" id="stamp">ONAYLI</div></div>
      <div class="checks">${['Geçerli', 'websiteniz.com’a ait', 'Süresi dolmamış'].map((c, k) => `<div id="ck${k}"><i>${ic('check')}</i><span>${c}</span></div>`).join('')}</div>
    </div>
    <div class="mode" id="mWarn"><div class="browser" style="bottom:auto;height:396px;background:#fff">
      <div class="chrome"><div class="addr" style="font-size:22px;gap:10px;padding:0 16px"><span class="nsec on">${ic('warn')}Güvenli değil</span><span style="color:#6b7487">websiteniz.com</span></div></div>
      <div class="wpage">${ic('warn')}<b>Bu site güvenli değil</b><span>Girdiğiniz bilgiler başkaları tarafından görülebilir.</span></div></div></div>
    <div class="mode" id="mRank"><div class="pill" style="top:84px;height:58px;font-size:23px">${ic('eye').replace('eye', 'eye')}<span>kahve çekirdeği satın al</span></div>
      ${[['A', 'rakipsite.com', false], ['W', 'websiteniz.com', true], ['B', 'baskasite.com', false]].map(([f, u, s], k) => `<div class="rk" id="rk${k}"><div class="fav" style="${s ? '' : 'background:#b9c0cc'}">${f}</div><div><div class="u">${s ? ic('lock') : ''}${u}</div><div class="ln" style="width:${[70, 84, 60][k]}%"></div></div></div>`).join('')}
    </div>
    <div class="mode" id="mPanel"><div class="panel"><div class="ph">${ic('server')}<span>Hosting paneli</span></div>
      <div class="prow"><span>SSL sertifikası</span><i class="tog" id="tg1"><b></b></i></div>
      <div class="prow"><span>Ücret</span><em id="free">Ücretsiz</em></div>
      <div class="prow"><span>Otomatik yenileme</span><i class="tog" id="tg2"><b></b></i><svg class="ic rf" id="rf" viewBox="0 0 24 24">${P.refresh}</svg></div></div></div>
    <div class="mode" id="mBars">
      <div class="bar2" id="bA"><div class="addr" style="font-size:22px;gap:10px;padding:0 16px"><span class="nsec on">${ic('warn')}Güvenli değil</span><span style="color:#6b7487">websiteniz.com</span></div><div class="blb bad">${ic('unlock')}Kilitsiz</div></div>
      <div class="bar2" id="bB"><div class="addr" style="font-size:22px;gap:10px;padding:0 16px"><span class="sec" style="display:inline-flex">${ic('lock')}</span><span>websiteniz.com</span></div><div class="blb good">${ic('lock')}Kilitli</div></div>
    </div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mForm', 'mCert', 'mWarn', 'mRank', 'mPanel', 'mBars'].map((k) => [k, $r(k)]));
  const flySeal = add(`<div id="flySeal">${ic('seal')}</div>`);

  // ---------------------------------------------------------------- pins in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const stem = () => add('<div class="stem"></div>');
  const mk = { adres: pin('sign', 'ADRES'), bina: pin('building', 'BİNA'), yol: pin('route', 'YOL') };
  const mkStem = { adres: stem(), bina: stem(), yol: stem() };
  const ghostQ = add('<div class="chip" style="font-family:Manrope;font-weight:800">KİLİT <span class="q">?</span></div>');
  const wifiChip = pin('wifi', 'ORTAK Wi-Fi');
  const keyA = pin('key', 'TARAYICINIZ', 'blue'), keyB = pin('key', 'SUNUCU', 'blue');
  const doorWarn = add(`<div class="chip warnchip">${ic('warn')}<span>Güvenli değil</span></div>`);
  const lens = add('<div id="lens"><div class="lin" id="lensIn"></div></div>');
  const lensIn = lens.querySelector('#lensIn');
  const lockChip = pin('lock', 'KİLİTLİ', 'blue');

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· 02</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'HTTP'], ['02', 'HTTPS'], ['03', 'SSL']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:112px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'HTTP', 'Açık kartpostal'), t: T.h0 },
    { e: sect('02', 'HTTPS', 'Kilitli kutu'), t: T.s0 },
    { e: sect('03', 'SSL', 'Kimlik kartı'), t: T.cIste },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('HTTP', 'şifresiz', 'Bilgi yolda açıkça taşınır; araya giren okuyabilir.'), w: [[T.hHttp - 0.1, T.hKafe - 0.2]] },
    { e: term('HTTPS', 'S = Secure (güvenli)', 'Bilgi şifrelenerek, kilitli bir kutuda taşınır.'), w: [[T.sS - 0.15, T.sAnahtar - 0.2]] },
    { e: term('SSL', 'sertifika · sitenin kimliği', 'Sitenin gerçekten o site olduğunu kanıtlar. Bugünkü teknik adı: TLS.'), w: [[T.cSSL - 0.15, T.cKimlik + 0.3]] },
  ];

  // ---------------------------------------------------------------- title, glossary, next, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">BÖLÜM 02</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tLock"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span>Kapınızdaki kilit</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tLockParts = [...title.querySelectorAll('#tLock rect, #tLock path')];
  tLockParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });

  const gloss = add(`<div id="gloss"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · SÖZLÜK</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${[['postcard', 'HTTP', 'Açık kartpostal'], ['box', 'HTTPS', 'Kilitli kutu'], ['idcard', 'SSL', 'Kimlik kartı']].map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k">${k}</div><div class="eqs">=</div><div class="v">${v}</div></div>`).join('')}
    <div class="foot">${ic('lock')}<span>“Güvenli değil” uyarısı yoksa kapınız kilitli.</span></div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 24 24"><path d="M3 20V11a5 5 0 0 1 10 0v9" id="mb1"/><path d="M8 6h9a4 4 0 0 1 4 4v10H3" id="mb2"/><path d="M15.5 10V3.5h3.5" id="mb3"/><path d="M5.5 14h5" id="mb4"/></svg>
    <div class="tt">Kapınızdaki posta kutusu</div><div class="ss">KURUMSAL E-POSTA</div></div>`);
  const mbParts = ['mb1', 'mb2', 'mb3', 'mb4'].map((id) => next.querySelector('#' + id));
  mbParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Bölüm 2 · Kapınızdaki kilit</div><div class="rule"></div>
    <img src="../../assets/fentra-logo.png" alt=""><div class="h">@fentra.digital</div></div>`);
  const eT = endf.querySelector('.t'), eS = endf.querySelector('.s'), eRule = endf.querySelector('.rule'), eLogo = endf.querySelector('img'), eH = endf.querySelector('.h');
  const flash = add('<div id="flash"></div>');

  const cap = add('<div id="cap"><div class="line"></div></div>');
  const capLine = cap.querySelector('.line');
  let capIdx = -1, capWords = [];

  // ================================================================ helpers
  const V = (a) => (a instanceof THREE.Vector3 ? a : typeof a === 'function' ? a() : new THREE.Vector3(...a));
  function place(e, anchor, a, { dx = 0, dy = 0, lift = 0, ax = 0.5, ay = 1, scale = 1 } = {}) {
    if (a <= 0.002) { show(e, 0); return null; }
    const s = city.project(V(anchor));
    if (s.behind || s.z > 1 || s.x < -300 || s.x > 1380 || s.y < -300 || s.y > 2220) { show(e, 0); return null; }
    show(e, a);
    tf(e, `translate(${s.x + dx}px, ${s.y + dy - lift}px) translate(${-ax * 100}%, ${-ay * 100}%) scale(${scale})`);
    return s;
  }
  function placeStem(e, anchor, a, len) {
    if (a <= 0.002) { show(e, 0); return; }
    const s = city.project(V(anchor));
    if (s.behind) { show(e, 0); return; }
    show(e, a); e.style.height = `${len}px`;
    tf(e, `translate(${s.x - 1}px, ${s.y - len}px)`);
  }
  const center = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const typed = (txt, t, a, b) => txt.slice(0, Math.round(clamp((t - a) / (b - a)) * txt.length));
  const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));

  // ================================================================ per frame
  function update(t) {
    // ---- canvas focus
    show(dark, 1 - smooth(prog(t, T.hookEnd - 0.1, T.title + 0.3)));
    const blurTitle = 6 * win(t, T.hookEnd, T.titleEnd + 0.25, 0.4, 0.45);
    const gl = smooth(prog(t, T.r0 - 0.5, T.r0 + 0.3));
    const blurOut = 9 * gl * (1 - 0.35 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6)));
    const bl = blurTitle + blurOut;
    const br = 1 - 0.35 * gl - 0.2 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6));
    canvas.style.filter = bl > 0.05 || br < 0.999 ? `blur(${bl.toFixed(2)}px) brightness(${br.toFixed(3)})` : 'none';
    show(vig, 0.6 + 0.4 * win(t, T.title - 0.2, T.titleEnd + 0.3) + 0.4 * gl);
    show(shadeTop, t > T.hookEnd ? 1 : 0);
    show(shadeBot, 0.85 + 0.15 * gl);

    // ---- hook: the payment page that says "Güvenli değil"
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    const barHl = win(t, T.bar - 0.1, T.warn + 0.8, 0.2, 0.3);
    $p('pAddr').classList.toggle('on-hl', barHl > 0.5);
    const redOn = t > T.red - 0.05;
    $p('pWarn').classList.toggle('on', redOn);
    $p('pWarn').style.transform = `scale(${1 + 0.18 * (pk(t, T.red + 0.15, 0.2) + pk(t, T.warn + 0.15, 0.2))})`;
    const wb = win(t, T.warn - 0.1, T.kart - 0.1, 0.25, 0.3), wbk = outBack(prog(t, T.warn - 0.1, T.warn + 0.3), 1.8);
    show(warnBig, wb); tf(warnBig, `translate(540px, 250px) translate(-50%, 0) scale(${lerp(0.6, 1, wbk)})`);
    const ct = typed('4531 89', t, T.kart + 0.25, T.girer - 0.2);
    $p('pCardTxt').textContent = ct;
    $p('pCard').classList.toggle('on-hl', t > T.kart - 0.05 && t < T.hookEnd + 0.3);
    show($p('pCaret'), t > T.kart - 0.05 ? blink(t) : 0);
    const tk = prog(t, T.kart - 0.1, T.kart + 0.35), tap = $p('pTap');
    Object.assign(tap.style, { left: `${150 - tk * 80}px`, top: `${462 - tk * 80}px`, width: `${40 + tk * 160}px`, height: `${40 + tk * 160}px` });
    show(tap, tk > 0 && tk < 1 ? 1 - tk : 0);
    const qa = win(t, T.girer, T.hookEnd + 0.2, 0.2, 0.25), qk = outBack(prog(t, T.girer, T.girer + 0.35), 2.2);
    show(qBubble, qa); tf(qBubble, `translate(800px, 700px) translate(-50%, -50%) scale(${lerp(0.4, 1, qk)}) rotate(${Math.sin(t * 5) * 6}deg)`);

    // ---- title
    const titleA = win(t, T.title - 0.1, T.titleEnd + 0.55, 0.05, 0.4);
    show(title, titleA);
    tf(title, `scale(${1 + 0.08 * smooth(prog(t, T.titleEnd, T.titleEnd + 0.55))})`);
    tChars.forEach((c, k) => {
      const kk = outCubic(prog(t, T.title - 0.08 + k * 0.035, T.title + 0.35 + k * 0.035));
      c.style.opacity = kk; c.style.transform = `translateY(${(1 - kk) * 50}px)`; c.style.filter = kk < 0.99 ? `blur(${(1 - kk) * 14}px)` : 'none';
    });
    show(tEp, smooth(prog(t, T.ep - 0.1, T.ep + 0.3))); tf(tEp, `translateY(${(1 - outCubic(prog(t, T.ep - 0.1, T.ep + 0.35))) * 20}px)`);
    tRule.style.width = `${520 * outCubic(prog(t, T.ep, T.ep + 0.7))}px`;
    show(tSub, smooth(prog(t, T.ep + 0.5, T.ep + 0.9)));
    tLockParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tKilit - 0.35 + k * 0.15, T.tKilit + 0.35 + k * 0.15))); });

    // ---- bridge: last episode's address, building, road
    const mA = win(t, T.bAdres - 0.2, T.bBugun + 0.4, 0.25, 0.4);
    [['adres', city.anchors.sign, T.bAdres], ['bina', city.anchors.heroTop, T.bBina], ['yol', [-42, 1, 70], T.bYol]].forEach(([k, a, t0]) => {
      const kk = prog(t, t0 - 0.1, t0 + 0.3), pulse = 1 + 0.15 * pk(t, t0 + 0.2, 0.25);
      place(mk[k], a, mA * kk, { lift: 110 * outBack(kk, 1.5), scale: lerp(0.6, 1, outBack(kk, 1.8)) * pulse });
      placeStem(mkStem[k], a, mA * kk * 0.9, 100 * outCubic(kk));
    });
    place(ghostQ, city.anchors.door, win(t, T.bKilit - 0.1, T.hTel - 0.2, 0.25, 0.3), { lift: 120 + Math.sin(t * 3) * 6, scale: lerp(0.7, 1, outBack(prog(t, T.bKilit - 0.1, T.bKilit + 0.3))) });

    // ---- chapter bar and section intros
    const chapA = win(t, T.h0 - 0.3, T.r0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.h0, T.s0 - 0.2), prog(t, T.s0, T.c0 - 0.2), prog(t, T.c0, T.pEnd)];
    const active = t < T.s0 ? 0 : t < T.c0 ? 1 : 2;
    segs.forEach((s, k) => { s.bar.style.width = `${fills[k] * 100}%`; s.lab.style.color = k === active ? '#f4f7ff' : k < active ? 'rgba(244,247,255,0.62)' : 'rgba(244,247,255,0.34)'; });
    sections.forEach(({ e, t: s0 }) => {
      show(e, win(t, s0 - 0.12, s0 + 2.1, 0.25, 0.45));
      const kin = outQuint(prog(t, s0 - 0.12, s0 + 0.5)), kout = inOut(prog(t, s0 + 1.65, s0 + 2.1));
      tf(e, `translate(${(1 - kin) * -70 + kout * -40}px, ${kout * -40}px)`);
      e.querySelector('.name').style.clipPath = `inset(0 ${(1 - outCubic(prog(t, s0, s0 + 0.55))) * 100}% 0 0)`;
      e.querySelector('.sub i').style.width = `${56 * outCubic(prog(t, s0 + 0.2, s0 + 0.7))}px`;
    });
    terms.forEach(({ e, w }) => {
      let a = 0, kin = 1;
      for (const [a0, a1] of w) { const aa = win(t, a0, a1, 0.3, 0.35); if (aa > a) { a = aa; kin = outQuint(prog(t, a0, a0 + 0.45)); } }
      show(e, a); tf(e, `translateX(${(1 - kin) * -60}px)`);
    });

    // ---- GERÇEKTE card
    const cardW = [[T.hTel + 0.4, T.sEnd + 0.4], [T.cSSL - 0.3, T.cKapi + 0.1], [T.w0 + 0.1, T.wEnd + 0.3], [T.p0 + 0.1, T.pEnd + 0.4]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mForm: win(t, T.hTel + 0.3, T.sEnd + 0.5, 0.01, 0.01),
      mCert: win(t, T.cSSL - 0.4, T.cKapi + 0.2, 0.01, 0.01),
      mWarn: win(t, T.w0, T.wGoogle, 0.01, 0.3),
      mRank: win(t, T.wGoogle - 0.25, T.wEnd + 0.5, 0.3, 0.01),
      mPanel: win(t, T.p0, T.pAdres + 0.1, 0.01, 0.3),
      mBars: win(t, T.pAdres - 0.15, T.pEnd + 0.5, 0.3, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      // HTTP → HTTPS: same login form, the address bar and what travels on the road change
      const secure = t > T.s0 + 0.1;
      show($r('fWarn'), secure ? 0 : 1); $r('fWarn').style.display = secure ? 'none' : ''; $r('fWarn').classList.toggle('on', true);
      $r('fLock').style.display = secure ? 'inline-flex' : 'none';
      $r('fUrl').innerHTML = secure ? '<b style="color:#1f9d55">https</b>://websiteniz.com' : '<b style="color:#d23b2f">http</b>://websiteniz.com';
      $r('fAddr').classList.toggle('on-hl', pk(t, T.hHttp + 0.3, 0.5) > 0.4 || pk(t, T.s0 + 0.3, 0.5) > 0.4 || pk(t, T.sS + 0.3, 0.45) > 0.4);
      const pw = secure ? '1234' : typed('1234', t, T.hSifre - 0.1, T.hSifre + 0.4);
      $r('fPassTxt').textContent = '•'.repeat(pw.length);
      show($r('fCaret'), !secure && t > T.hSifre - 0.3 && t < T.hOku + 0.5 ? blink(t) : 0);
      const wireA = smooth(prog(t, T.hKart - 0.2, T.hKart + 0.2));
      show($r('wire'), wireA);
      const wv = $r('wireV');
      if (!secure) {
        const k = prog(t, T.hSifre - 0.1, T.hSifre + 0.4);
        wv.innerHTML = `kullanici=websiteniz&amp;sifre=<b class="leak">${'1234'.slice(0, Math.round(k * 4)) || '····'}</b>`;
        $r('wire').classList.toggle('bad', t > T.hOku - 0.1);
        $r('wireH').textContent = t > T.hOku - 0.1 ? 'BAŞKASI OKUYABİLİR' : 'YOLDA GİDEN BİLGİ';
      } else {
        const k = prog(t, T.sKutu, T.sKoyar + 0.2);
        wv.innerHTML = k < 1 ? `kullanici=websiteniz&amp;sifre=<b>${'1234'}</b>`.slice(0, Math.max(10, Math.round(60 * (1 - k)))) + gib(t, Math.round(k * 26))
          : `<span class="enc">${gib(t * (t > T.sAnlamsiz - 0.2 && t < T.sEnd ? 1 : 0.02), 30)}</span>`;
        $r('wire').classList.toggle('bad', false); $r('wire').classList.toggle('good', k > 0.9);
        $r('wireH').textContent = k > 0.9 ? 'ŞİFRELİ · ANLAMSIZ KARAKTERLER' : 'YOLDA GİDEN BİLGİ';
      }
      const ka = smooth(prog(t, T.sAnahtar - 0.15, T.sAnahtar + 0.3)) * (1 - smooth(prog(t, T.sEnd, T.sEnd + 0.3)));
      show($r('keys'), ka);
      $r('k1').classList.toggle('on', t > T.sTarayici - 0.1); $r('k2').classList.toggle('on', t > T.sSunucu - 0.1);
      // certificate: ID card, stamp, checks
      const stk = prog(t, T.cKurum - 0.05, T.cKurum + 0.25);
      show($r('stamp'), stk > 0 ? 1 : 0); tf($r('stamp'), `rotate(-14deg) scale(${lerp(2.2, 1, outCubic(stk))})`);
      $r('idc').classList.toggle('on-hl', pk(t, T.cKimlik + 0.3, 0.5) > 0.4);
      [T.cGecerli, T.cAdres, T.cSure].forEach((c, k) => {
        const e = $r('ck' + k), kk = outBack(prog(t, c - 0.05, c + 0.3), 2);
        show(e, smooth(prog(t, T.cKontrol - 0.2 + k * 0.12, T.cKontrol + 0.2 + k * 0.12)));
        e.classList.toggle('ok', kk > 0.3); e.querySelector('i').style.transform = `scale(${lerp(0.4, 1, kk)})`;
      });
      // search ranking: the secure site moves to the top
      const rkK = inOut(prog(t, T.wGoogle + 0.3, T.wGoogle + 1.1));
      tf($r('rk0'), `translateY(${rkK * 104}px)`); tf($r('rk1'), `translateY(${-rkK * 104}px)`);
      $r('rk1').classList.toggle('on-hl', rkK > 0.95);
      // hosting panel toggles
      $r('tg1').classList.toggle('on', t > T.pHosting + 0.55);
      show($r('free'), smooth(prog(t, T.pUcretsiz - 0.1, T.pUcretsiz + 0.25))); tf($r('free'), `scale(${lerp(0.6, 1, outBack(prog(t, T.pUcretsiz - 0.1, T.pUcretsiz + 0.3), 2))})`);
      $r('tg2').classList.toggle('on', t > T.pYeniler + 0.1);
      $r('rf').style.transform = `rotate(${t > T.pYeniler ? (t - T.pYeniler) * 360 : 0}deg)`; show($r('rf'), t > T.pYeniler ? 1 : 0.3);
      // two address bars: without and with the lock
      const b1 = outQuint(prog(t, T.pAdres - 0.1, T.pAdres + 0.35)), b2 = outQuint(prog(t, T.pWarn + 0.6, T.pWarn + 1.0));
      show($r('bA'), b1); tf($r('bA'), `translateX(${(1 - b1) * 40}px)`);
      show($r('bB'), b2); tf($r('bB'), `translateX(${(1 - b2) * 40}px)`);
      $r('bB').classList.toggle('on-hl', t > T.pKilitli - 0.1);
    }
    // the stamp flies to the door and becomes the padlock
    const fk = prog(t, T.cHer + 0.1, T.cKilit - 0.1);
    if (fk > 0 && fk < 1) {
      const from = center($r('stamp')), to = city.project(city.anchors.lock());
      const k = inOut(fk);
      show(flySeal, fk < 0.85 ? 1 : 1 - (fk - 0.85) / 0.15);
      tf(flySeal, `translate(${lerp(from.x, to.x, k)}px, ${lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * 160}px) translate(-50%, -50%) scale(${lerp(1, 0.5, k)}) rotate(${k * 360}deg)`);
    } else show(flySeal, 0);

    // ---- pins in the city
    place(wifiChip, city.anchors.wifi, win(t, T.hWifi - 0.15, T.hEnd, 0.25, 0.4), { lift: 70, scale: lerp(0.6, 1, outBack(prog(t, T.hWifi - 0.15, T.hWifi + 0.25), 1.8)) });
    const kA = win(t, T.sTarayici - 0.15, T.sYolda + 0.2, 0.25, 0.4), kB = win(t, T.sSunucu - 0.15, T.sYolda + 0.2, 0.25, 0.4);
    place(keyA, city.anchors.gate, kA, { lift: 30, scale: lerp(0.6, 1, outBack(prog(t, T.sTarayici - 0.15, T.sTarayici + 0.25), 1.8)) });
    place(keyB, city.anchors.heroTop, kB, { lift: 30, scale: lerp(0.6, 1, outBack(prog(t, T.sSunucu - 0.15, T.sSunucu + 0.25), 1.8)) });
    place(doorWarn, city.anchors.door, win(t, T.wWarn - 0.15, T.wEnd, 0.2, 0.4), { lift: 150 + Math.sin(t * 4) * 5, scale: lerp(0.6, 1, outBack(prog(t, T.wWarn - 0.15, T.wWarn + 0.25), 2)) });
    place(lockChip, city.anchors.door, Math.max(win(t, T.cKilit + 0.3, T.w0, 0.25, 0.2), win(t, T.pKilitli - 0.1, T.r0, 0.25, 0.4)), { lift: 150, scale: lerp(0.6, 1, outBack(prog(t, T.cKilit + 0.3, T.cKilit + 0.7), 1.8)) });
    // the magnifier's lens: a readable postcard, then gibberish
    const readA = win(t, T.hOku - 0.25, T.s0 - 0.1, 0.3, 0.3), gibA = win(t, T.sAnlamsiz - 0.5, T.sEnd, 0.3, 0.35);
    const lensA = Math.max(readA, gibA);
    const ls = place(lens, city.anchors.mag, lensA, { ax: 0.5, ay: 0.5, dx: -250, dy: -40, scale: lerp(0.5, 1, outBack(clamp(Math.max(prog(t, T.hOku - 0.25, T.hOku + 0.2), prog(t, T.sAnlamsiz - 0.5, T.sAnlamsiz - 0.05))), 1.6)) });
    lens.classList.toggle('gib', gibA > readA);
    lensIn.innerHTML = gibA > readA ? `<span>${gib(t, 8)}</span><span>${gib(t + 3.1, 8)}</span><span>${gib(t + 7.7, 8)}</span>` : '<small>Şifre:</small><b>1234</b><small>Kart: 4531 ••••</small>';

    // ---- glossary, save, next, end
    const gA = win(t, T.r0 - 0.45, T.next - 0.05, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, T.r0 - 0.45, T.r0 + 0.1))) * 60}px) translateX(${-inOut(prog(t, T.next - 0.45, T.next - 0.05)) * 120}px)`);
    [T.gHttp, T.gHttps, T.gSsl].forEach((w, k) => {
      const kk = outQuint(prog(t, w - 0.1, w + 0.35));
      show(gRows[k], kk); tf(gRows[k], `translateX(${(1 - kk) * 50}px)`);
      gRows[k].style.borderColor = `rgba(91,156,255,${0.12 + 0.7 * pk(t, w + 0.3, 0.35)})`;
    });
    show(gFoot, smooth(prog(t, T.gSsl + 1.2, T.gSsl + 1.6)));
    const sv = prog(t, T.saveW - 0.05, T.saveW + 0.3);
    bmPath.style.fill = sv > 0.3 ? '#1c73fd' : 'transparent'; bmPath.style.stroke = sv > 0.3 ? '#1c73fd' : 'currentColor';
    tf(bm, `scale(${1 + 0.35 * Math.sin(clamp(sv) * Math.PI)})`);
    bm.style.borderColor = sv > 0.3 ? '#1c73fd' : 'rgba(255,255,255,0.25)';
    bm.style.boxShadow = sv > 0.3 ? '0 0 40px rgba(28,115,253,0.6)' : 'none';
    show(saveLbl, win(t, T.saveW, T.next - 0.1, 0.25, 0.3)); tf(saveLbl, `translate(${1010 - 196}px, ${538 - 30 * outBack(prog(t, T.saveW, T.saveW + 0.35), 2)}px) translate(-100%, -100%)`);
    show(next, win(t, T.next - 0.2, T.endCard - 0.05, 0.35, 0.35)); tf(next, `translateX(${(1 - outQuint(prog(t, T.next - 0.2, T.next + 0.3))) * 100}px)`);
    mbParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.posta - 0.5 + k * 0.16, T.posta + 0.3 + k * 0.16))); });
    const eA = smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3));
    show(endf, eA);
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.28 * pk(t, T.cKilit + 0.3, 0.18));

    // ---- captions
    const chunks = cues.chunks;
    let ci = -1;
    for (let i = 0; i < chunks.length; i++) if (t >= chunks[i].start - 0.12 && t < chunks[i].hide) ci = i;
    if (ci !== capIdx) {
      capIdx = ci;
      capLine.innerHTML = ci < 0 ? '' : chunks[ci].words.map((w) => `<span class="w">${cues.words[w].w}</span>`).join(' ');
      capWords = [...capLine.querySelectorAll('.w')];
    }
    if (ci >= 0) {
      const c = chunks[ci];
      show(cap, smooth(prog(t, c.start - 0.12, c.start + 0.05)) * (1 - smooth(prog(t, c.hide - 0.14, c.hide))));
      tf(cap, `translateY(${(1 - outCubic(prog(t, c.start - 0.12, c.start + 0.1))) * 14}px)`);
      capWords.forEach((e, k) => {
        const w = cues.words[c.words[k]];
        const on = t >= w.start - 0.03, cur = on && t < w.end + 0.02;
        e.style.color = cur ? '#6aa8ff' : '#ffffff'; e.style.opacity = on ? 1 : 0.42;
      });
    } else show(cap, 0);
  }
  return { update };
}
