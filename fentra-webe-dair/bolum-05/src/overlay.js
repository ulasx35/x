// Episode 5 overlays: the phone with a vanishing site, the "GERÇEKTE" card, term cards, chapter bar, labels pinned to
// the city, captions, title, glossary and end frame. Pure function of time.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outQuint, win } from './anim.js';
import { T } from './timeline.js';

const P = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  warn: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  mailbox: '<path d="M3 20V11a5 5 0 0 1 10 0v9"/><path d="M8 6h9a4 4 0 0 1 4 4v10H3"/><path d="M15.5 10V3.5h3.5"/><path d="M5.5 14h5"/>',
  sign: '<path d="M12 3v18M5 6h12l2 2.5-2 2.5H5zM8 21h8"/>',
  building: '<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12.5L20 3.5M16.5 7l2.5 2.5M14 9.5l2 2"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
  safe: '<rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="12" cy="11.5" r="3.5"/><path d="M12 8v1.2M12 13.8V15M8.5 11.5h1.2M14.3 11.5h1.2M6 19v2M18 19v2"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.6"/><path d="M20 4v7h-7"/>',
  userx: '<circle cx="10" cy="8" r="4"/><path d="M3 21c1-4 3.8-6 7-6 1.4 0 2.7.3 3.8 1M16 15l5 5M21 15l-5 5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  db: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="16" cy="9" r="1.8"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
  door: '<path d="M5 21V4h11v17M3 21h18M13 12h.01"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };
const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;
  const NEWLOCK = T.uYedek + 0.85;                     // same moment as in world.js
  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');

  // ---------------------------------------------------------------- phone (hook): the site empties out
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer" style="background:#ffffff"><div class="bbar"><div class="addr2">${ic('lock')}<span>websiteniz.com</span></div></div>
      <div class="site5"><div class="nav5"><i></i><b>Websiteniz</b></div>
        <div class="hero5" id="sHero"><span>Yeni sezon</span></div>
        <div class="h15" id="sH1">Ürünlerimiz</div>
        <div class="grid5">${[0, 1, 2, 3].map((k) => `<div id="g${k}"><i></i><b></b><u></u></div>`).join('')}</div>
        <div class="lines5">${[0, 1, 2, 3].map((k) => `<i id="ln${k}"></i>`).join('')}</div></div>
      <div class="nf" id="nf"><div class="nfi">${ic('warn')}</div><b>Sayfa bulunamadı</b><span>Aradığınız içerik artık yok.</span></div>
    </div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const qBubble = add('<div id="qBubble">?</div>');

  // ---------------------------------------------------------------- the GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mCause"><div class="causes"><div class="ch">Siteler neden çöker?</div>
      ${[['server', 'Sunucu arızası'], ['refresh', 'Hatalı güncelleme'], ['userx', 'Saldırı'], ['trash', 'Yanlışlıkla silme']].map(([i, s], k) => `<div class="cz" id="cz${k}"><i>${ic(i)}</i><span>${s}</span><em>${ic('x')}</em></div>`).join('')}</div></div>
    <div class="mode" id="mRestore"><div class="panel"><div class="ph">${ic('safe')}<span>Yedekler</span></div>
      ${[['Bugün', '03:00'], ['Dün', '03:00'], ['3 Ekim', '03:00']].map(([d, h], k) => `<div class="prow bk" id="bk${k}"><span>${d} <small>${h}</small></span><small class="sz">1,2 GB</small>${k === 0 ? '<b class="rbtn" id="rbtn">Geri yükle</b>' : ''}</div>`).join('')}
      <div class="prog5"><i id="rsBar"></i></div></div>
      <div class="sbanner" id="rsOk" style="top:420px">${ic('check')}<span>Site geri yüklendi · 4 dk</span></div></div>
    <div class="mode" id="mWhere"><div class="panel"><div class="ph">${ic('safe')}<span>Yedek nerede duruyor?</span></div>
      ${[['server', 'Aynı sunucu', false], ['server', 'Başka sunucu', true], ['cloud', 'Bulut', true]].map(([i, s, ok], k) => `<div class="prow wh" id="wh${k}"><i class="whi">${ic(i)}</i><span>${s}</span><em class="${ok ? 'goodt' : 'badt'}">${ic(ok ? 'check' : 'x')}</em></div>`).join('')}</div></div>
    <div class="mode" id="mCal"><div class="calp"><div class="ch2">${ic('calendar')}<span>Otomatik yedek · her gün 03:00</span></div>
      <div class="days">${[...Array(14)].map((_, k) => `<div id="dy${k}"><small>${k + 1}</small><i>${ic('check')}</i></div>`).join('')}</div>
      <div class="tst" id="tst0"><i>${ic('check')}</i><span>Geri yükleme testi</span><b>Çalışıyor</b></div>
      <div class="tst bad" id="tst1"><i>${ic('x')}</i><span>Denenmemiş yedek</span><b>Belirsiz</b></div></div></div>
    <div class="mode" id="mUpd"><div class="panel"><div class="ph">${ic('refresh')}<span>Güncellemeler</span><em class="badt" id="upN">3</em></div>
      <div class="prow up first" id="up0"><span>${ic('safe')} Önce yedek al</span><b id="upB">Bekliyor</b></div>
      ${[['Site yazılımı', '6.4 → 6.5'], ['İletişim formu eklentisi', '2.1 → 2.3'], ['Galeri eklentisi', '1.8 → 2.0']].map(([n, v], k) => `<div class="prow up" id="up${k + 1}"><span>${n}<small>${v}</small></span><b>Eski</b></div>`).join('')}</div></div>
    <div class="mode" id="mHost"><div class="panel"><div class="ph">${ic('server')}<span>Hosting paneli</span></div>
      <div class="prow"><span>Otomatik yedekleme</span><div class="tog" id="hTog"><b></b></div></div>
      ${[['Var mı?', 'Evet'], ['Ne sıklıkla?', 'Her gün'], ['Nerede?', 'Başka sunucu + bulut']].map(([q, a], k) => `<div class="prow qa" id="qa${k}"><i>${ic('check')}</i><span>${q}</span><b>${a}</b></div>`).join('')}</div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mCause', 'mRestore', 'mWhere', 'mCal', 'mUpd', 'mHost'].map((k) => [k, $r(k)]));

  // ---------------------------------------------------------------- pins in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const stem = () => add('<div class="stem"></div>');
  const warn = (icon, text) => add(`<div class="chip warnchip">${ic(icon)}<span>${text}</span></div>`);
  const chip = (icon, text, extra = '') => add(`<div class="chip" style="font-family:Manrope;font-weight:800;${extra}">${ic(icon)}<span>${text}</span></div>`);
  const mk = { adres: pin('sign', 'ADRES'), bina: pin('building', 'BİNA'), yol: pin('route', 'YOL'), kilit: pin('lock', 'KİLİT'), posta: pin('mailbox', 'POSTA') };
  const mkStem = { adres: stem(), bina: stem(), yol: stem(), kilit: stem(), posta: stem() };
  const noQueue = chip('check', 'Kuyruk yok', 'background:rgba(31,157,85,0.95)');
  const causePins = [warn('server', 'Sunucu arızası'), warn('refresh', 'Hatalı güncelleme'), warn('userx', 'Saldırgan'), warn('trash', 'Silinen dosya')];
  const contentPins = [chip('file', 'Dosyalar'), chip('image', 'Görseller'), chip('db', 'Veritabanı')];
  const keyPin = pin('key', 'YEDEK ANAHTAR', 'blue');
  const samePin = warn('warn', 'Aynı binada');
  const cloudPin = pin('cloud', 'BULUT', 'blue');
  const clockPin = chip('clock', 'Her gün 03:00');
  const okPin = chip('check', 'Çalışıyor', 'background:rgba(31,157,85,0.95)');
  const badPin = warn('x', 'Uymadı');
  const oldPin = warn('lock', 'Eski kilit · v1.2');
  const atkPin = warn('userx', 'Saldırganlar');
  const newPin = pin('lock', 'YENİ KİLİT · v6.5', 'blue');

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· 05</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'ÇÖKÜŞ'], ['02', 'YEDEK'], ['03', 'GÜNCELLEME']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub, size = 104) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:${size}px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'ÇÖKÜŞ', 'Siteler neden çöker?'), t: T.c0 },
    { e: sect('02', 'YEDEK', 'Kasadaki yedek anahtar'), t: T.k0 },
    { e: sect('03', 'GÜNCELLEME', 'İkinci kalkan', 76), t: T.u0 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('YEDEK', '', 'Sitenizin tam kopyası: dosyalar, görseller, veritabanı.'), w: [[T.kKopya - 0.2, T.kKasa - 0.1]] },
    { e: term('GÜNCELLEME', '', 'Yazılımın açıkları kapatılmış yeni sürümü.'), w: [[T.uYazilim - 0.2, T.uSaldir - 0.1]] },
  ];

  // ---------------------------------------------------------------- title, glossary, next, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">BÖLÜM 05</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.key}</svg><span>Yedek anahtar</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path, #tIcon circle')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const gloss = add(`<div id="gloss"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · SÖZLÜK</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${[['key', 'Yedek', 'Yedek anahtarınız'], ['cloud', 'Başka yerdeki kopya', 'İkinci kasa'], ['lock', 'Güncelleme', 'Kilidinizi yeni tutar']].map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k" style="width:auto;font-size:30px;white-space:nowrap">${k}</div><div class="eqs">=</div><div class="v" style="font-size:29px;white-space:nowrap">${v}</div></div>`).join('')}
    <div class="foot">${ic('safe')}<span>Güncellemeden önce mutlaka yedek alın.</span></div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 48 24" style="width:420px;height:210px">
    <path d="M3 6l9-3 9 3 9-3v15l-9 3-9-3-9 3z"/><path d="M12 3v15M21 6v15"/>
    <path d="M40 21s-5.5-5-5.5-9.5a5.5 5.5 0 0 1 11 0c0 4.5-5.5 9.5-5.5 9.5z"/><circle cx="40" cy="11.5" r="2"/></svg>
    <div class="tt">Haritadaki yeriniz</div><div class="ss">GOOGLE İŞLETME PROFİLİ</div></div>`);
  const kParts = [...next.querySelectorAll('svg path, svg circle')];
  kParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Bölüm 5 · Yedek anahtar</div><div class="rule"></div>
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
  const pop = (t, a, s = 1.8) => outBack(prog(t, a - 0.12, a + 0.3), s);
  const gone = (t, a) => 1 - smooth(prog(t, a, a + 0.35));

  // ================================================================ per frame
  function update(t) {
    show(dark, 1 - smooth(prog(t, T.hookEnd - 0.1, T.title + 0.3)));
    const blurTitle = 6 * win(t, T.hookEnd, T.titleEnd + 0.25, 0.4, 0.45);
    const gl = smooth(prog(t, T.r0 - 0.5, T.r0 + 0.3));
    const bl = blurTitle + 9 * gl * (1 - 0.35 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6)));
    const br = 1 - 0.35 * gl - 0.2 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6));
    canvas.style.filter = bl > 0.05 || br < 0.999 ? `blur(${bl.toFixed(2)}px) brightness(${br.toFixed(3)})` : 'none';
    show(vig, 0.6 + 0.4 * win(t, T.title - 0.2, T.titleEnd + 0.3) + 0.4 * gl);
    show(shadeTop, t > T.hookEnd ? 1 : 0);
    show(shadeBot, 0.85 + 0.15 * gl);

    // ---- hook: the page empties out piece by piece
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    show($p('sHero'), gone(t, T.sayfalar)); show($p('sH1'), gone(t, T.sayfalar + 0.15));
    [0, 1, 2, 3].forEach((k) => { const e = $p('g' + k), g = gone(t, T.urunler + k * 0.14); show(e, g); tf(e, `scale(${lerp(0.6, 1, g)})`); });
    [0, 1, 2, 3].forEach((k) => { const e = $p('ln' + k); e.style.width = `${(1 - smooth(prog(t, T.yillarca + k * 0.18, T.yillarca + k * 0.18 + 0.4))) * [92, 80, 88, 60][k]}%`; });
    const nf = outBack(prog(t, T.gitmis - 0.1, T.gitmis + 0.3), 1.6);
    show($p('nf'), nf * 3); tf($p('nf'), `translate(-50%, -50%) scale(${lerp(0.7, 1, clamp(nf))})`);
    const qa = win(t, T.yedeginiz - 0.1, T.hookEnd + 0.25, 0.2, 0.25);
    show(qBubble, qa); tf(qBubble, `translate(820px, 640px) translate(-50%, -50%) scale(${lerp(0.4, 1, pop(t, T.yedeginiz, 2.2))}) rotate(${Math.sin(t * 5) * 6}deg)`);

    // ---- title
    show(title, win(t, T.title - 0.1, T.titleEnd + 0.55, 0.05, 0.4));
    tf(title, `scale(${1 + 0.08 * smooth(prog(t, T.titleEnd, T.titleEnd + 0.55))})`);
    tChars.forEach((c, k) => {
      const kk = outCubic(prog(t, T.title - 0.08 + k * 0.035, T.title + 0.35 + k * 0.035));
      c.style.opacity = kk; c.style.transform = `translateY(${(1 - kk) * 50}px)`; c.style.filter = kk < 0.99 ? `blur(${(1 - kk) * 14}px)` : 'none';
    });
    show(tEp, smooth(prog(t, T.ep - 0.1, T.ep + 0.3))); tf(tEp, `translateY(${(1 - outCubic(prog(t, T.ep - 0.1, T.ep + 0.35))) * 20}px)`);
    tRule.style.width = `${520 * outCubic(prog(t, T.ep, T.ep + 0.7))}px`;
    show(tSub, smooth(prog(t, T.ep + 0.5, T.ep + 0.9)));
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tAnahtar - 0.5 + k * 0.1, T.tAnahtar + 0.2 + k * 0.1))); });

    // ---- bridge pins
    const mA = win(t, T.bAdres - 0.2, T.bKuyruk + 0.1, 0.25, 0.4);
    [['adres', city.anchors.sign, T.bAdres], ['bina', city.anchors.heroTop, T.bBina], ['yol', [-20, 1, 14], T.bYol], ['kilit', city.anchors.lock, T.bKilit], ['posta', city.anchors.mailbox, T.bPosta]].forEach(([k, a, t0]) => {
      const kk = prog(t, t0 - 0.1, t0 + 0.3);
      place(mk[k], a, mA * kk, { lift: 100 * outBack(kk, 1.5), scale: lerp(0.6, 1, outBack(kk, 1.8)) * (1 + 0.15 * pk(t, t0 + 0.2, 0.25)) });
      placeStem(mkStem[k], a, mA * kk * 0.9, 90 * outCubic(kk));
    });
    place(noQueue, city.anchors.door, win(t, T.bKuyruk - 0.1, T.bPeki + 0.2, 0.25, 0.3), { lift: 30, scale: lerp(0.6, 1, pop(t, T.bKuyruk)) });

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.c0 - 0.3, T.r0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.c0, T.k0 - 0.2), prog(t, T.k0, T.u0 - 0.2), prog(t, T.u0, T.hEnd)];
    const active = t < T.k0 ? 0 : t < T.u0 ? 1 : 2;
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
    const cardW = [[T.c0 + 0.6, T.cEnd + 0.3], [T.kOlur - 0.3, T.kEnd + 0.3], [T.oAyni - 0.2, T.oEnd + 0.3], [T.aHer - 0.3, T.aEnd + 0.3], [T.uYazilim + 0.2, T.uEnd + 0.3], [T.h0 + 0.2, T.r0 - 0.15]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mCause: win(t, T.c0, T.cEnd + 0.6, 0.01, 0.01), mRestore: win(t, T.kOlur - 0.6, T.kEnd + 0.6, 0.01, 0.01),
      mWhere: win(t, T.oAyni - 0.5, T.oEnd + 0.6, 0.01, 0.01), mCal: win(t, T.aHer - 0.6, T.aEnd + 0.6, 0.01, 0.01),
      mUpd: win(t, T.uYazilim - 0.1, T.uEnd + 0.6, 0.01, 0.01), mHost: win(t, T.h0, T.r0 + 0.5, 0.01, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      [T.cSunucu, T.cGuncel, T.cKotu, T.cDosya].forEach((w, k) => {
        const e = $r('cz' + k), kk = outQuint(prog(t, w - 0.15, w + 0.25));
        show(e, 0.35 + 0.65 * kk); tf(e, `translateX(${(1 - kk) * 16}px)`); e.classList.toggle('on', t > w - 0.05);
      });
      const press = t > T.kGeri - 0.1 && t < T.kGeri + 0.25;
      $r('rbtn').style.background = press ? '#0f4fc0' : ''; $r('rbtn').classList.toggle('on-hl', pk(t, T.kGeri, 0.35) > 0.4);
      $r('bk0').classList.toggle('sel', t > T.kGeri - 0.1);
      $r('rsBar').style.width = `${100 * smooth(prog(t, T.kGeri + 0.2, T.kEski))}%`;
      const ok = outBack(prog(t, T.kEski - 0.05, T.kEski + 0.3), 1.8);
      show($r('rsOk'), ok * 3); tf($r('rsOk'), `scale(${lerp(0.7, 1, ok)})`);
      [T.oAyni, T.oBaska, T.oBulut].forEach((w, k) => {
        const e = $r('wh' + k), kk = outQuint(prog(t, w - 0.15, w + 0.3)); show(e, kk); tf(e, `translateX(${(1 - kk) * 40}px)`);
        e.classList.toggle('on-hl', pk(t, w + 0.3, 0.4) > 0.4);
      });
      [...Array(14)].forEach((_, k) => { $r('dy' + k).classList.toggle('ok', t > T.aHer - 0.1 + k * ((T.aDene - T.aHer) / 14)); });
      const t0 = outQuint(prog(t, T.aDeneyin - 0.2, T.aDeneyin + 0.25)); show($r('tst0'), t0); tf($r('tst0'), `translateX(${(1 - t0) * 40}px)`);
      const t1 = outQuint(prog(t, T.aUymayan - 0.2, T.aUymayan + 0.25)); show($r('tst1'), t1); tf($r('tst1'), `translateX(${(1 - t1) * 40}px)`);
      const backed = t > T.uYedek + 0.2;
      $r('upB').textContent = backed ? 'Alındı ✓' : 'Bekliyor'; $r('up0').classList.toggle('ok', backed); $r('up0').classList.toggle('on-hl', pk(t, T.uOnce + 0.3, 0.45) > 0.4);
      let left = 3;
      [1, 2, 3].forEach((k) => {
        const done = t > NEWLOCK - 0.3 + (k - 1) * 0.18, e = $r('up' + k);
        e.classList.toggle('ok', done); e.querySelector('b').textContent = done ? 'Güncel ✓' : 'Eski'; if (done) left -= 1;
        e.classList.toggle('stale', !done && t > T.uEski - 0.1);
      });
      $r('upN').textContent = String(left); $r('upN').className = left ? 'badt' : 'goodt';
      $r('hTog').classList.toggle('on', t > T.hOto - 0.05);
      [T.hVar, T.hSik, T.hNerede].forEach((w, k) => {
        const e = $r('qa' + k), kk = outQuint(prog(t, w - 0.15, w + 0.3)); show(e, kk); tf(e, `translateX(${(1 - kk) * 40}px)`);
        e.classList.toggle('on-hl', pk(t, T.hUc + 0.35 + k * 0.15, 0.35) > 0.4);
      });
    }

    // ---- pins
    const cA = [[T.cSunucu, T.cKotu + 0.3, 'racks'], [T.cGuncel, T.cKotu + 0.8, 'floor5'], [T.cKotu, T.cSizar + 0.5, 'attacker'], [T.cDosya + 0.1, T.cSil + 0.2, 'floor3']];
    causePins.forEach((e, k) => { const [a0, a1, an] = cA[k]; place(e, city.anchors[an], win(t, a0 - 0.1, a1, 0.2, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, a0)) }); });
    [T.kDosya, T.kGorsel, T.kVeri].forEach((w, k) => place(contentPins[k], city.anchors.holo, win(t, w - 0.1, T.kKasa + 0.2, 0.2, 0.3), { dx: 120, ax: 0, ay: 0.5, dy: 40 + k * 74, scale: lerp(0.6, 1, pop(t, w)) }));
    place(keyPin, city.anchors.key, win(t, T.kAnahtar - 0.25, T.kOlur, 0.25, 0.3), { lift: 30, scale: lerp(0.6, 1, pop(t, T.kAnahtar - 0.1)) });
    place(samePin, city.anchors.ghostSafe, win(t, T.oAyni, T.oBaska, 0.25, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.oAyni + 0.1)) });
    place(cloudPin, city.anchors.cloud, win(t, T.oBulut - 0.1, T.oEnd + 0.3, 0.25, 0.3), { lift: 10, scale: lerp(0.6, 1, pop(t, T.oBulut)) });
    place(clockPin, city.anchors.clock, win(t, T.aHer - 0.1, T.aDene, 0.25, 0.3), { lift: 10, scale: lerp(0.6, 1, pop(t, T.aHer)) });
    place(okPin, city.anchors.lock, win(t, T.aDeneyin + 0.1, T.aDenen - 0.1, 0.2, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.aDeneyin + 0.2)) });
    place(badPin, city.anchors.lock, win(t, T.aUymayan, T.aEnd + 0.4, 0.2, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.aUymayan + 0.1)) });
    place(oldPin, city.anchors.lock, win(t, T.uEski - 0.1, NEWLOCK - 0.1, 0.25, 0.25), { lift: 20, scale: lerp(0.6, 1, pop(t, T.uEski)) });
    place(atkPin, city.anchors.attackers, win(t, T.uSaldir + 0.2, NEWLOCK + 0.6, 0.25, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.uSaldir + 0.3)) });
    place(newPin, city.anchors.lock, win(t, NEWLOCK + 0.2, T.uEnd + 0.4, 0.25, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, NEWLOCK + 0.3)) });

    // ---- glossary, save, next, end
    const gA = win(t, T.r0 - 0.45, T.next - 0.05, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, T.r0 - 0.45, T.r0 + 0.1))) * 60}px) translateX(${-inOut(prog(t, T.next - 0.45, T.next - 0.05)) * 120}px)`);
    [T.gYedek, T.gYedek + 1.3, T.gGunc].forEach((w, k) => {
      const kk = outQuint(prog(t, w - 0.1, w + 0.35));
      show(gRows[k], kk); tf(gRows[k], `translateX(${(1 - kk) * 50}px)`);
      gRows[k].style.borderColor = `rgba(91,156,255,${0.12 + 0.7 * pk(t, w + 0.3, 0.35)})`;
    });
    show(gFoot, smooth(prog(t, T.rEnd - 0.2, T.rEnd + 0.2)));
    const sv = prog(t, T.saveW - 0.05, T.saveW + 0.3);
    bmPath.style.fill = sv > 0.3 ? '#1c73fd' : 'transparent'; bmPath.style.stroke = sv > 0.3 ? '#1c73fd' : 'currentColor';
    tf(bm, `scale(${1 + 0.35 * Math.sin(clamp(sv) * Math.PI)})`);
    bm.style.borderColor = sv > 0.3 ? '#1c73fd' : 'rgba(255,255,255,0.25)';
    bm.style.boxShadow = sv > 0.3 ? '0 0 40px rgba(28,115,253,0.6)' : 'none';
    show(saveLbl, win(t, T.saveW, T.next - 0.1, 0.25, 0.3)); tf(saveLbl, `translate(${1010 - 196}px, ${538 - 30 * outBack(prog(t, T.saveW, T.saveW + 0.35), 2)}px) translate(-100%, -100%)`);
    show(next, win(t, T.next - 0.2, T.endCard - 0.05, 0.35, 0.35)); tf(next, `translateX(${(1 - outQuint(prog(t, T.next - 0.2, T.next + 0.3))) * 100}px)`);
    kParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.harita - 0.5 + k * 0.1, T.harita + 0.2 + k * 0.1))); });
    show(endf, smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3)));
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.2 * pk(t, T.kGeri + 0.45, 0.18));

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
