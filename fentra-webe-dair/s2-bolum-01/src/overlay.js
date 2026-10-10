// Season 2, episode 1 overlays: the phone with a search, the "GERÇEKTE" card, the three-step strip, term cards, chapter bar,
// labels pinned to the city, the rank badge, captions, title, the episode card and end frame. Pure function of time.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outQuint, win } from './anim.js';
import { T } from './timeline.js';

const P = {
  sign: '<path d="M12 3v18M5 6h12l2 2.5-2 2.5H5zM8 21h8"/>',
  building: '<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  mailbox: '<path d="M3 20V11a5 5 0 0 1 10 0v9"/><path d="M8 6h9a4 4 0 0 1 4 4v10H3"/><path d="M15.5 10V3.5h3.5"/><path d="M5.5 14h5"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4-5"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12.5L20 3.5M16.5 7l2.5 2.5M14 9.5l2 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  warn: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  book: '<path d="M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1V19c-2.5-1-6-1-9 1-3-2-6.5-2-9-1z"/><path d="M12 6.5V20"/>',
  bot: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8"/><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  rank: '<path d="M4 20h16M7 20v-6M12 20V8M17 20v-9"/>',
  up: '<path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };
const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;
  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');

  // ---------------------------------------------------------------- phone (hook): a search, ten results in under a second
  const RES = [['Gülüş Diş Kliniği', 'gulusdis.com'], ['Beyaz İnci Ağız ve Diş', 'beyazinci.com.tr'], ['Dent Plus Kliniği', 'dentplus.com'],
    ['Diş Dünyası', 'disdunyasi.com'], ['Parlak Gülüş', 'parlakgulus.com'], ['Estetik Diş Merkezi', 'estetikdis.com'], ['Sağlıklı Diş', 'saglikidis.com'],
    ['Diş Atölyesi', 'disatolyesi.com'], ['Ağız Diş Merkezi', 'agizdis.com.tr'], ['Gülen Yüzler', 'gulenyuzler.com']];
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer srch"><div class="sq">${ic('search')}<span id="sq"></span><i class="caret" id="scar"></i></div>
      <div class="sstat" id="sstat">Yaklaşık 2.340.000 sonuç <b>(0,41 saniye)</b></div>
      <div class="slist">${RES.map(([n, u], k) => `<div class="sres" id="sr${k}"><i class="sn">${k + 1}</i><div><b>${n}</b><small>${u}</small></div></div>`).join('')}</div>
    </div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const mil = add(`<div id="mil"><b id="milN">0</b><span>site</span></div>`);
  const qBubble = add('<div id="qBubble">?</div>');

  // ---------------------------------------------------------------- the GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mCrawl"><div class="panel"><div class="ph">${ic('bot')}<span>Tarama kaydı</span></div>
      ${[['websiteniz.com/', 'Tarandı'], ['/hizmetler', 'Tarandı'], ['/iletisim', 'Tarandı'], ['/kampanya', 'Bağlantı yok']].map(([u, s], k) => `<div class="prow cr ${k === 3 ? 'bad' : ''}" id="cr${k}"><span class="mono">${u}</span><b>${s}</b><i>${ic(k === 3 ? 'x' : 'check')}</i></div>`).join('')}</div></div>
    <div class="mode" id="mIndex"><div class="panel"><div class="ph">${ic('book')}<span>Dizin raporu</span></div>
      <div class="ix"><div class="ixb ok" id="ixOk"><b>3</b><span>sayfa dizinde</span></div><div class="ixb bad" id="ixNo"><b>1</b><span>sayfa dizinde değil</span></div></div>
      <div class="prow cr bad" id="ixRow"><span class="mono">/kampanya</span><b>Aramada çıkmaz</b><i>${ic('x')}</i></div></div></div>
    <div class="mode" id="mSerp"><div class="pill" style="top:76px">${ic('search')}<span>en iyi diş kliniği</span></div>
      <div class="serp">${[...Array(5)].map((_, k) => `<div class="srp" id="sp${k}"><i>${k + 1}</i><div><b></b><small></small></div></div>`).join('')}</div></div>
    <div class="mode" id="mSite"><div class="pill" style="top:76px">${ic('search')}<span id="siteQ"></span><i class="caret" id="siteCar"></i></div>
      <div class="sstat2" id="siteStat">Yaklaşık 3 sonuç</div>
      ${['websiteniz.com', 'websiteniz.com/hizmetler', 'websiteniz.com/iletisim'].map((u, k) => `<div class="res sres2" id="sx${k}"><div class="srow"><div class="fav">W</div><div><div class="nm">Websiteniz</div><div class="url">${u}</div></div></div></div>`).join('')}</div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mCrawl', 'mIndex', 'mSerp', 'mSite'].map((k) => [k, $r(k)]));

  // ---------------------------------------------------------------- the three steps
  const STEPS = [['bot', 'GEZ', 'Tarama'], ['book', 'KAYDET', 'Dizine ekleme'], ['rank', 'SIRALA', 'Sıralama']];
  const steps = add(`<div id="steps">${STEPS.map(([i, a, b], k) => `<div class="st" id="st${k}"><div class="sn">${k + 1}</div><div class="si">${ic(i)}</div><b>${a}</b><small>${b}</small></div>${k < 2 ? `<div class="sa" id="sa${k}">→</div>` : ''}`).join('')}</div>`);
  const stE = [0, 1, 2].map((k) => steps.querySelector('#st' + k)), saE = [0, 1].map((k) => steps.querySelector('#sa' + k));

  // ---------------------------------------------------------------- labels in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const chip = (icon, text, extra = '') => add(`<div class="chip" style="font-family:Manrope;font-weight:800;${extra}">${ic(icon)}<span>${text}</span></div>`);
  const warn = (icon, text) => add(`<div class="chip warnchip">${ic(icon)}<span>${text}</span></div>`);
  const GREEN = 'background:rgba(31,157,85,0.95)', GREY = 'background:rgba(40,46,60,0.92);color:#aab4c8';
  const SEASON = [['sign', 'ADRES', 'sign'], ['building', 'BİNA', 'heroTop'], ['route', 'YOL', 'route'], ['lock', 'KİLİT', 'lock'], ['mailbox', 'POSTA', 'mailbox'], ['gauge', 'HIZ', 'gauge'], ['key', 'YEDEK', 'safe'], ['pin', 'HARİTA', 'heroPin']];
  const sPins = SEASON.map(([i, s]) => pin(i, s, 'blue'));
  const s1done = chip('check', 'SEZON 1 TAMAM', GREEN);
  const upChip = add(`<div class="chip upchip">${ic('up')}<span>Google'da öne çık</span></div>`);
  const guidePin = pin('compass', 'REHBER', 'blue');
  const addrPins = [0, 1, 2].map(() => add(`<div class="apin">${ic('pin')}</div>`));
  const crawlTag = chip('bot', 'GEZGİN', 'background:rgba(28,115,253,0.92)');
  const pageTags = ['/hizmetler', '/iletisim', '/kampanya'].map((s, k) => add(`<div class="chip ptag ${k === 2 ? 'orph' : ''}" id="pt${k}"><span class="mono">${s}</span>${k === 2 ? '<span class="q">?</span>' : `<i>${ic('check')}</i>`}</div>`));
  const noLink = warn('link', 'Bağlantı yok');
  const bookPin = pin('book', 'KAYIT DEFTERİ', 'blue');
  const added = chip('check', 'Deftere eklendi', GREEN);
  const qFly = add(`<div class="chip qfly">${ic('search')}<span>en iyi diş kliniği</span></div>`);
  const onlyBook = chip('book', 'Sadece deftere bakar', 'background:rgba(28,115,253,0.92)');
  const notIn = warn('x', 'Defterde yok · Aramada çıkmaz');
  const badge = add(`<div class="rbadge"><small>SIRA</small><b id="rkN">9</b></div>`);
  const rkN = badge.querySelector('#rkN');
  const CRIT = [['target', 'Konuya uygun'], ['shield', 'Güvenilir'], ['bolt', 'Hızlı'], ['phone', 'Telefonda rahat']];
  const crit = add(`<div id="crit">${CRIT.map(([i, s], k) => `<div class="cr2" id="ct${k}"><div class="ci">${ic(i)}</div><span>${s}</span><i>${ic('check')}</i></div>`).join('')}</div>`);
  const ctE = [0, 1, 2, 3].map((k) => crit.querySelector('#ct' + k));
  const page1 = pin('rank', '1. SAYFA · ANA CADDE', 'blue');
  const page2 = add(`<div class="pin grey"><div class="ic2">${ic('rank')}</div><span>2. SAYFA · ARKA SOKAK</span></div>`);
  const backB = [...Array(city.backN)].map((_, k) => add(`<div class="gbadge">${11 + k}</div>`));
  const nobody = chip('user', 'Neredeyse kimse yok', GREY);

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· S2 · 01</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'GEZGİN'], ['02', 'DEFTER'], ['03', 'SIRALAMA']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub, size = 104) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:${size}px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'GEZGİN', 'Tarama'), t: T.c0 },
    { e: sect('02', 'DEFTER', 'Dizin'), t: T.i0 },
    { e: sect('03', 'SIRALAMA', 'Ana cadde', 96), t: T.r0 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('DİZİN', '', 'Google’ın kayıt defteri. Aramada yalnızca dizindeki sayfalar çıkar.'), w: [[T.iArama + 1.0, T.iOlmayan - 0.2]] },
    { e: term('SEO', 'Arama motoru optimizasyonu', 'Sitenizi aramada öne çıkarma işi.'), w: [[T.xSeo - 0.15, T.xEnd + 0.3]] },
  ];

  // ---------------------------------------------------------------- title, episode card, next episode, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">SEZON 2 · BÖLÜM 01</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.compass}</svg><span>Şehrin rehberi</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path, #tIcon circle')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const GL = [['bot', 'Tarama', 'Gezginin dolaşması'], ['book', 'Dizin', 'Kayıt defteri'], ['rank', 'Sıralama', 'Ana caddedeki yeriniz'], ['up', 'SEO', 'Aramada öne çıkma işi']];
  const gloss = add(`<div id="gloss" class="s2"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · S2 · BÖLÜM 1</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${GL.map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k">${k}</div><div class="eqs">=</div><div class="v">${v}</div></div>`).join('')}
    <div class="foot">Kontrol: <b>site:websiteniz.com</b></div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 48 30" style="width:440px;height:275px">
    <path d="M24 29V13"/><rect x="5" y="3" width="38" height="12" rx="2"/><path d="M10 9h6M19 9h9M31 9h7"/><path d="M14 22h20"/><circle cx="40" cy="23" r="4"/><path d="M42.8 25.8l3 3"/></svg>
    <div class="tt">Müşterinin kelimeleri</div><div class="ss">S2 · BÖLÜM 2 · ANAHTAR KELİMELER</div></div>`);
  const kParts = [...next.querySelectorAll('svg path, svg circle, svg rect')];
  kParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Sezon 2 · Bölüm 1 · Şehrin rehberi</div><div class="rule"></div>
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
  const pop = (t, a, s = 1.8) => outBack(prog(t, a - 0.12, a + 0.3), s);
  const typed = (txt, t, a, b) => txt.slice(0, Math.round(clamp((t - a) / (b - a)) * txt.length));
  const rowIn = (e, t, a, dx = 40) => { const k = outQuint(prog(t, a - 0.15, a + 0.3)); show(e, k); tf(e, `translateX(${(1 - k) * dx}px)`); return k; };
  const A = city.anchors;
  // search results on the card: the other sites in a fixed order, yours inserted at its rank
  const SERP_OTHERS = RES.map(([n, u]) => [n, u]);
  const P1AT = T.cBag + 1.8, P2AT = T.cHic + 0.35;
  const RANKS = [T.r0 + 0.2, T.rUygun, T.rGuven, T.rHizli, T.rTel];
  const myRank = (t) => [9, 7, 5, 3, 1][Math.max(0, RANKS.filter((w) => t > w + 0.1).length - 1)];

  // ================================================================ per frame
  function update(t) {
    show(dark, 1 - smooth(prog(t, T.hookEnd - 0.1, T.title + 0.3)));
    const blurTitle = 6 * win(t, T.hookEnd, T.titleEnd + 0.25, 0.4, 0.45);
    const G0 = T.save - 0.2, G1 = T.next + 0.9, N0 = T.next + 0.7;
    const gl = smooth(prog(t, G0 - 0.1, G0 + 0.5));
    const bl = blurTitle + 9 * gl * (1 - 0.35 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6)));
    const br = 1 - 0.35 * gl - 0.2 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6));
    canvas.style.filter = bl > 0.05 || br < 0.999 ? `blur(${bl.toFixed(2)}px) brightness(${br.toFixed(3)})` : 'none';
    show(vig, 0.6 + 0.4 * win(t, T.title - 0.2, T.titleEnd + 0.3) + 0.4 * gl);
    show(shadeTop, t > T.hookEnd ? 1 : 0);
    show(shadeBot, 0.85 + 0.15 * gl);

    // ---- hook: a search, ten results; millions of sites; how?
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    $p('sq').textContent = typed('en iyi diş kliniği', t, T.yaz - 0.3, T.yazdi + 0.15);
    show($p('scar'), t < T.saniye && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
    show($p('sstat'), smooth(prog(t, T.saniye - 0.1, T.saniye + 0.25)));
    RES.forEach((_, k) => rowIn($p('sr' + k), t, T.on - 0.1 + k * 0.07, 30));
    const milA = win(t, T.milyon - 0.15, T.hookEnd + 0.1, 0.25, 0.3);
    show(mil, milA * (1 - smooth(prog(t, T.nasil - 0.2, T.nasil + 0.2))));
    mil.querySelector('#milN').textContent = Math.round(1e9 * Math.pow(outCubic(prog(t, T.milyon - 0.1, T.milyon + 1.4)), 2)).toLocaleString('tr-TR') + '+';
    tf(mil, `translate(-50%, 0) scale(${lerp(0.7, 1, pop(t, T.milyon))})`);
    const qa = win(t, T.nasil - 0.1, T.hookEnd + 0.25, 0.2, 0.25);
    show(qBubble, qa); tf(qBubble, `translate(820px, 560px) translate(-50%, -50%) scale(${lerp(0.4, 1, pop(t, T.nasil, 2.2))}) rotate(${Math.sin(t * 5) * 6}deg)`);

    // ---- title
    show(title, win(t, T.title - 0.1, T.titleEnd + 0.55, 0.05, 0.4));
    tf(title, `scale(${1 + 0.08 * smooth(prog(t, T.titleEnd, T.titleEnd + 0.55))})`);
    tChars.forEach((c, k) => {
      const kk = outCubic(prog(t, T.title - 0.08 + k * 0.035, T.title + 0.35 + k * 0.035));
      c.style.opacity = kk; c.style.transform = `translateY(${(1 - kk) * 50}px)`; c.style.filter = kk < 0.99 ? `blur(${(1 - kk) * 14}px)` : 'none';
    });
    show(tEp, smooth(prog(t, T.ep - 0.1, T.ep + 0.3))); tf(tEp, `translateY(${(1 - outCubic(prog(t, T.ep - 0.1, T.ep + 0.35))) * 20}px)`);
    tRule.style.width = `${520 * outCubic(prog(t, T.ep, T.ep + 0.7))}px`;
    show(tSub, smooth(prog(t, T.ep + 0.8, T.ep + 1.2)));
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tRehber - 0.5 + k * 0.15, T.tRehber + 0.3 + k * 0.15))); });

    // ---- bridge: last season's pins; then "öne çık"
    const sA = win(t, T.b0 - 0.2, T.bBu + 0.5, 0.25, 0.4);
    sPins.forEach((e, k) => { const t0 = T.b0 - 0.1 + k * ((T.bKur - T.b0 + 0.2) / 8); place(e, A[SEASON[k][2]], sA * smooth(prog(t, t0, t0 + 0.25)), { lift: 20 + (k % 2) * 46, scale: 0.8 * lerp(0.6, 1, pop(t, t0 + 0.1)) }); });
    place(s1done, A.heroPin, win(t, T.bKur + 0.1, T.bBu + 0.6, 0.25, 0.35), { lift: 30, scale: lerp(0.6, 1, pop(t, T.bKur + 0.2)) });
    place(upChip, A.heroPin, win(t, T.bOne - 0.2, T.g0 + 0.6, 0.25, 0.35), { lift: 30 + 40 * outCubic(prog(t, T.bOne - 0.2, T.bOne + 0.6)), scale: lerp(0.6, 1, pop(t, T.bOne)) });

    // ---- the guide: its tower, its light; three addresses; three steps
    place(guidePin, A.hqTop, win(t, T.gRehber - 0.3, T.gEnd + 0.3, 0.3, 0.4), { lift: 10, scale: lerp(0.6, 1, pop(t, T.gRehber - 0.2)) });
    addrPins.forEach((e, k) => place(e, () => A.addr(k), win(t, T.gAdres + 0.1 + k * 0.15, T.gUc + 0.6, 0.2, 0.35), { lift: 6, scale: lerp(0.5, 1, pop(t, T.gAdres + 0.2 + k * 0.15, 2.2)) }));
    const stA = win(t, T.gUc - 0.2, T.c0 + 0.4, 0.3, 0.4) + win(t, T.x0 - 0.1, T.xSeo - 0.2, 0.3, 0.4);
    show(steps, stA);
    stE.forEach((e, k) => {
      const t0 = t < T.x0 ? T.gUc - 0.1 + k * 0.28 : [T.xGez, T.xDef, T.xReh][k] - 0.1;
      const kk = outQuint(prog(t, t0, t0 + 0.4)); show(e, kk); tf(e, `translateY(${(1 - kk) * 30}px)`);
      e.classList.toggle('on', t > T.x0 ? t > t0 + 0.1 : pk(t, t0 + 0.3, 0.35) > 0.5);
    });
    saE.forEach((e, k) => show(e, smooth(prog(t, (t < T.x0 ? T.gUc + 0.1 + k * 0.28 : [T.xDef, T.xReh][k] - 0.2), (t < T.x0 ? T.gUc + 0.35 + k * 0.28 : [T.xDef, T.xReh][k])))));

    // ---- 01 crawling
    place(crawlTag, A.crawler, win(t, T.cGez + 0.2, T.cBag - 0.2, 0.25, 0.3), { lift: 26, scale: 0.9 });
    pageTags.forEach((e, k) => {
      const t0 = T.cSayfa - 0.3 + k * 0.25;
      const at = [{ lift: 10 }, { ax: 0, ay: 0.5, dx: 34, lift: 30 }, { ax: 1, ay: 0.5, dx: -34, lift: 30 }][k];   // above, right, left
      place(e, () => A.pav(k), win(t, t0, k === 2 ? T.iEnd + 0.3 : T.cEnd + 0.3, 0.3, 0.35), { ...at, scale: lerp(0.6, 0.92, pop(t, t0 + 0.1)) });
      e.classList.toggle('ok', k < 2 && t > (k === 0 ? P1AT : P2AT));
    });
    place(noLink, () => A.pav(2), win(t, T.cHic + 0.5, T.cEnd + 0.3, 0.25, 0.35), { ax: 1, ay: 0, dx: -34, lift: -6, scale: lerp(0.6, 0.95, pop(t, T.cHic + 0.6)) });

    // ---- 02 the index
    place(bookPin, A.hqTop, win(t, T.iDefter - 0.3, T.iOlmayan - 0.2, 0.3, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.iDefter - 0.2)) });
    place(added, A.book, win(t, T.iEkler + 0.35, T.iArama + 0.4, 0.25, 0.35), { lift: -120, scale: lerp(0.6, 1, pop(t, T.iEkler + 0.45)) });
    const qk = inOut(prog(t, T.iArama + 0.5, T.iDeftere + 0.1));
    const bookS = city.project(A.book);
    if (win(t, T.iArama + 0.3, T.iDeftere + 0.4, 0.25, 0.25) > 0.002 && !bookS.behind) {
      show(qFly, win(t, T.iArama + 0.3, T.iDeftere + 0.4, 0.25, 0.25));
      tf(qFly, `translate(${lerp(540, bookS.x, qk)}px, ${lerp(330, bookS.y, qk)}px) translate(-50%, -50%) scale(${lerp(1, 0.4, qk)})`);
    } else show(qFly, 0);
    place(onlyBook, A.book, win(t, T.iDeftere - 0.1, T.iOlmayan + 0.1, 0.25, 0.3), { lift: -170, scale: lerp(0.6, 1, pop(t, T.iDeftere)) });
    place(notIn, () => A.pav(2), win(t, T.iOlmayan + 1.0, T.iEnd + 0.3, 0.25, 0.35), { ax: 1, ay: 0, dx: -34, lift: -6, scale: lerp(0.6, 0.95, pop(t, T.iOlmayan + 1.1)) });

    // ---- 03 ranking: your badge climbs; the four criteria; the avenue; the back street
    const rk = t > T.x0 ? 1 : myRank(t);
    const bA = win(t, T.r0 + 0.5, T.rIkinci + 0.2, 0.3, 0.35) + win(t, T.xReh - 0.2, T.save - 0.1, 0.3, 0.35);
    rkN.textContent = rk;
    badge.classList.toggle('first', rk === 1);
    const lastChange = Math.max(...RANKS.filter((w) => t > w + 0.1));
    place(badge, A.heroPin, bA, { lift: 14, scale: (1 + 0.25 * pk(t, lastChange + 0.25, 0.2)) * lerp(0.6, 1, pop(t, T.r0 + 0.6)) });
    show(crit, win(t, T.rOne - 0.2, T.rIlk - 0.1, 0.3, 0.35));
    ctE.forEach((e, k) => { const w = RANKS[k + 1]; rowIn(e, t, w - 0.05, 40); e.classList.toggle('ok', t > w + 0.1); });
    place(page1, () => new THREE.Vector3(26, 1.5, 14), win(t, T.rIlk - 0.1, T.rIkinci + 0.3, 0.25, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.rIlk)) });
    place(page2, () => new THREE.Vector3(26, 1.5, -14), win(t, T.rIkinci + 0.5, T.rEnd + 0.3, 0.25, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.rIkinci + 0.6)) });
    backB.forEach((e, k) => place(e, () => A.back(k), win(t, T.rIkinci + 0.6 + k * 0.08, T.rEnd + 0.3, 0.25, 0.35), { lift: 6, scale: lerp(0.6, 1, pop(t, T.rIkinci + 0.7 + k * 0.08)) }));
    place(nobody, () => new THREE.Vector3(26, 1.5, -14), win(t, T.rKimse - 0.1, T.rEnd + 0.3, 0.25, 0.35), { ay: 0, lift: -24, scale: lerp(0.6, 0.95, pop(t, T.rKimse)) });

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.c0 - 0.3, T.x0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.c0, T.i0 - 0.2), prog(t, T.i0, T.r0 - 0.2), prog(t, T.r0, T.rEnd)];
    const active = t < T.i0 ? 0 : t < T.r0 ? 1 : 2;
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
    const cardW = [[T.cBag + 1.3, T.cEnd + 0.3], [T.iOlmayan - 0.3, T.iEnd + 0.3], [T.rOne - 0.3, T.rIlk - 0.1], [T.k0 + 0.3, T.kEnd + 0.3]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mCrawl: win(t, T.cBag - 0.3, T.cEnd + 0.6, 0.01, 0.01), mIndex: win(t, T.iOlmayan - 0.6, T.iEnd + 0.6, 0.01, 0.01),
      mSerp: win(t, T.rOne - 0.6, T.rIlk + 0.2, 0.01, 0.01), mSite: win(t, T.k0, T.kEnd + 0.6, 0.01, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      [T.cBag + 0.4, P1AT, P2AT, T.cHic + 0.6].forEach((w, k) => { const e = $r('cr' + k); rowIn(e, t, w); e.classList.toggle('on-hl', pk(t, w + 0.3, 0.35) > 0.4); });
      rowIn($r('ixOk'), t, T.iOlmayan - 0.1, 0); rowIn($r('ixNo'), t, T.iOlmayan + 0.1, 0); rowIn($r('ixRow'), t, T.iOlmayan + 0.4);
      $r('ixNo').classList.toggle('on-hl', pk(t, T.iCikmaz + 0.2, 0.4) > 0.4);
      // the results list: yours at its rank (if in the top five), the others in order around it
      const r = myRank(t), list = [];
      let o = 0;
      for (let k = 0; k < 5; k++) list.push(k + 1 === r ? ['Websiteniz', 'websiteniz.com', true] : [...SERP_OTHERS[o++], false]);
      list.forEach(([n, u, me], k) => {
        const e = $r('sp' + k); e.querySelector('b').textContent = n; e.querySelector('small').textContent = u;
        e.classList.toggle('me', me); rowIn(e, t, T.rOne - 0.2 + k * 0.08, 30);
      });
      $r('siteQ').textContent = typed('site:websiteniz.com', t, T.kSite - 0.1, T.kAdres + 0.5);
      show($r('siteCar'), t < T.kAdres + 0.6 && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
      show($r('siteStat'), smooth(prog(t, T.kAdres + 0.5, T.kAdres + 0.8)));
      [0, 1, 2].forEach((k) => { const e = $r('sx' + k); rowIn(e, t, T.kAdres + 0.6 + k * 0.25, 30); e.classList.toggle('on-hl', pk(t, T.kCikan + 0.4 + k * 0.15, 0.3) > 0.4); });
    }

    // ---- the episode card, save, next episode, end
    const gA = win(t, G0, G1, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, G0, G0 + 0.55))) * 60}px) translateX(${-inOut(prog(t, G1 - 0.4, G1)) * 120}px)`);
    gRows.forEach((r, k) => { const kk = outQuint(prog(t, G0 + 0.1 + k * 0.08, G0 + 0.5 + k * 0.08)); show(r, kk); tf(r, `translateX(${(1 - kk) * 50}px)`); });
    show(gFoot, smooth(prog(t, G0 + 0.5, G0 + 0.8)));
    const sv = prog(t, T.saveW - 0.05, T.saveW + 0.3);
    bmPath.style.fill = sv > 0.3 ? '#1c73fd' : 'transparent'; bmPath.style.stroke = sv > 0.3 ? '#1c73fd' : 'currentColor';
    tf(bm, `scale(${1 + 0.35 * Math.sin(clamp(sv) * Math.PI)})`);
    bm.style.borderColor = sv > 0.3 ? '#1c73fd' : 'rgba(255,255,255,0.25)';
    bm.style.boxShadow = sv > 0.3 ? '0 0 40px rgba(28,115,253,0.6)' : 'none';
    show(saveLbl, win(t, T.saveW, G1 - 0.1, 0.25, 0.3)); tf(saveLbl, `translate(${1010 - 196}px, ${458 - 30 * outBack(prog(t, T.saveW, T.saveW + 0.35), 2)}px) translate(-100%, -100%)`);
    show(next, win(t, N0 - 0.2, T.endCard - 0.05, 0.35, 0.35)); tf(next, `translateX(${(1 - outQuint(prog(t, N0 - 0.2, N0 + 0.3))) * 100}px)`);
    kParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, N0 + 0.4 + k * 0.1, N0 + 1.1 + k * 0.1))); });
    show(endf, smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3)));
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.15 * pk(t, T.rTel + 0.15, 0.18) + 0.15 * pk(t, T.xReh + 0.1, 0.18));

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
