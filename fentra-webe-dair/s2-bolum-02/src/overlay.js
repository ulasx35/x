// Season 2, episode 2 overlays: the phone (your site's words vs the customer's search), the "GERÇEKTE" card, term cards,
// chapter bar, labels pinned to the city, captions, title, the episode card and end frame. Pure function of time.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outQuint, win } from './anim.js';
import { T } from './timeline.js';

const P = {
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  warn: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  book: '<path d="M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1V19c-2.5-1-6-1-9 1-3-2-6.5-2-9-1z"/><path d="M12 6.5V20"/>',
  bubble: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12.5L20 3.5M16.5 7l2.5 2.5M14 9.5l2 2"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  page: '<path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4M9 11h6M9 14.5h6M9 18h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
  arrow: '<path d="M4 12h15M13.5 6.5L19 12l-5.5 5.5"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
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

  // ---------------------------------------------------------------- phone (hook): your site's words above, the customer's search below
  const RIV = [['Evden Eve Nakliyat · Hızlı Taşıma', 'hizlitasima.com'], ['Ekonomik Evden Eve Nakliyat', 'ekonakliyat.com'], ['Nakliyat Fiyatları 2026', 'nakliyatfiyat.com']];
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer kw">
      <div class="kwSite" id="kwSite"><div class="kwNav"><b>Websiteniz</b><i></i><i></i><i></i></div>
        <div class="kwHero"><small>HAKKIMIZDA</small><b>Kurumsal <span id="jw">Lojistik Çözümleri</span></b><em>Entegre tedarik zinciri yönetimi</em></div></div>
      <div class="kwNe" id="kwNe">≠</div>
      <div class="kwSrch" id="kwSrch"><div class="sq">${ic('search')}<span id="kq"></span><i class="caret" id="kcar"></i></div>
        ${RIV.map(([n, u], k) => `<div class="sres" id="kr${k}"><i class="sn">${k + 1}</i><div><b>${n}</b><small>${u}</small></div></div>`).join('')}
        <div class="kwMiss" id="kwMiss">${ic('x')}<span>Websiteniz bu aramada yok</span></div></div>
    </div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);

  // ---------------------------------------------------------------- the GERÇEKTE card
  const SUG = ['nakliyat fiyatları', 'evden eve nakliyat', 'nakliyat karşıyaka', 'nakliyat asansörlü', 'parça eşya nakliyat'];
  const REL = ['evden eve nakliyat fiyatları', 'şehir içi nakliyat', 'ofis taşıma', 'asansörlü taşımacılık', 'eşya depolama', 'nakliyat sigortası'];
  const real = add(`<div id="real">
    <div class="mode" id="mLang"><div class="panel"><div class="ph">${ic('bubble')}<span>Sizin diliniz → Müşterinin dili</span></div>
      ${[['lojistik çözümleri', 'evden eve nakliyat'], ['implant', 'eksik diş tedavisi']].map(([a, b], k) => `<div class="prow lg" id="lg${k}"><span class="lw">${a}</span><i>${ic('arrow')}</i><b>${b}</b></div>`).join('')}
      <div class="lgNote" id="lgNote">${ic('search')}<span>Müşteri böyle arıyor</span></div></div></div>
    <div class="mode" id="mSug"><div class="sugBox"><div class="sq2">${ic('search')}<span id="sgq"></span><i class="caret" id="sgcar"></i></div>
      ${SUG.map((s, k) => `<div class="sg" id="sg${k}">${ic('search')}<span>${s.replace('nakliyat', '<b>nakliyat</b>')}</span></div>`).join('')}</div></div>
    <div class="mode" id="mRel"><div class="relBox"><div class="relH">Benzer aramalar</div>
      <div class="relG">${REL.map((s, k) => `<div class="rl" id="rl${k}">${ic('search')}<span>${s}</span></div>`).join('')}</div></div></div>
    <div class="mode" id="mCmp"><div class="cmp2">
      <div class="cc" id="cc0"><div class="ch">${ic('search')}<b>nakliyat</b></div>
        <div class="cr"><small>Arayan</small><div class="bar3"><i style="width:94%"></i></div></div><div class="cr"><small>Rakip</small><div class="bar3 red"><i style="width:96%"></i></div></div>
        <div class="cn" id="cn0">${ic('eye')}<span>Bakıyor</span></div></div>
      <div class="cc long" id="cc1"><div class="ch">${ic('search')}<b>Karşıyaka'da evden eve nakliyat fiyatı</b></div>
        <div class="cr"><small>Arayan</small><div class="bar3"><i style="width:22%"></i></div></div><div class="cr"><small>Rakip</small><div class="bar3 red"><i style="width:18%"></i></div></div>
        <div class="cn ok" id="cn1">${ic('box')}<span>Taşınacak</span></div></div></div></div>
    <div class="mode" id="mPage"><div class="pg"><div class="pgUrl">${ic('search')}<span>websiteniz.com/<b>evden-eve-nakliyat</b></span></div>
      <div class="pgRow" id="pgT"><small>BAŞLIK</small><div><b class="kw1">Evden Eve Nakliyat</b> | Websiteniz</div></div>
      <div class="pgRow" id="pgH"><small>İLK CÜMLE</small><div>Karşıyaka'da <b class="kw1">evden eve nakliyat</b> için ücretsiz keşif yapıyoruz.</div></div>
      <div class="pgRow" id="pgM"><small>METİN</small><div class="pgTxt" id="pgTxt">Eşyalarınızı paketliyor, asansörle taşıyor ve yeni evinize yerleştiriyoruz. <b class="kw1">Evden eve nakliyat</b> fiyatı için…</div>
        <div class="pgTxt bad" id="pgStuff">nakliyat nakliyat evden eve nakliyat nakliyat ucuz nakliyat nakliyat en iyi nakliyat nakliyat nakliyat…</div></div>
      <div class="sbanner bad" id="pgBad" style="top:auto;bottom:22px">${ic('ban')}<span>Kelime doldurma: işe yaramaz</span></div></div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mLang', 'mSug', 'mRel', 'mCmp', 'mPage'].map((k) => [k, $r(k)]));

  // ---------------------------------------------------------------- labels in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const chip = (icon, text, extra = '') => add(`<div class="chip" style="font-family:Manrope;font-weight:800;${extra}">${ic(icon)}<span>${text}</span></div>`);
  const warn = (icon, text) => add(`<div class="chip warnchip">${ic(icon)}<span>${text}</span></div>`);
  const GREEN = 'background:rgba(31,157,85,0.95)', GREY = 'background:rgba(40,46,60,0.92);color:#aab4c8', ORANGE = 'background:rgba(214,106,40,0.95)';
  const guidePin = pin('compass', 'REHBER', 'blue');
  const query = add(`<div class="chip qfly">${ic('search')}<span>evden eve nakliyat</span></div>`);
  const matchShop = chip('check', 'Eşleşti', GREEN);
  const noMatch = warn('x', 'Eşleşmedi');
  const matchYou = chip('check', 'Şimdi eşleşti', GREEN);
  const askQ = add(`<div class="chip askq">${ic('bubble')}<span>Bizi nasıl aradınız?</span></div>`);
  const ANS = ['evden eve nakliyat', 'parça eşya taşıma', 'nakliyat fiyatları'];
  const answers = ANS.map((s) => add(`<div class="chip ans">${ic('search')}<span>${s}</span></div>`));
  const rivalTags = [...Array(city.rivalN)].map(() => chip('search', 'NAKLİYAT', ORANGE));
  const browsing = chip('eye', 'Sadece bakıyor', GREY);
  const longQ = add(`<div class="chip qfly long">${ic('search')}<span>Karşıyaka'da evden eve nakliyat fiyatı</span></div>`);
  const moving = chip('box', 'Taşınmak üzere', GREEN);
  const PAGES = ['/evden-eve-nakliyat', '/ofis-tasima', '/esya-depolama'];
  const pageTags = PAGES.map((s) => add(`<div class="chip ptag ok"><span class="mono">${s}</span><i>${ic('check')}</i></div>`));
  const oneTopic = pin('page', '1 SAYFA = 1 KONU', 'blue');
  const caught = warn('eye', 'Rehber fark etti');
  const recapPin = pin('key', 'Anahtar kelime = müşterinin dili', 'blue');

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· S2 · 02</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'KELİME'], ['02', 'ARAŞTIRMA'], ['03', 'SAYFA']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub, size = 104) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:${size}px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'KELİME', 'Müşterinin dili'), t: T.w0 },
    { e: sect('02', 'ARAŞTIRMA', 'Müşteri ne yazıyor?', 90), t: T.f0 },
    { e: sect('03', 'SAYFA', 'Bir sayfa, bir konu'), t: T.p0 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('ANAHTAR KELİME', '', 'Müşterinin Google’a yazdığı kelimeler.'), w: [[T.w0 + 0.1, T.wYaz + 0.4]] },
  ];
  terms[0].e.querySelector('.k b').style.fontSize = '50px';

  // ---------------------------------------------------------------- title, episode card, next episode, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">SEZON 2 · BÖLÜM 02</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.bubble}</svg><span>Müşterinin kelimeleri</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path, #tIcon circle')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const GL = [['key', 'Anahtar kelime', 'Müşterinin yazdığı kelimeler'], ['search', 'Uzun arama', 'Az kişi, karara yakın'], ['page', 'Bir sayfa', 'Bir konu'], ['ban', 'Kelime doldurma', 'İşe yaramaz']];
  const gloss = add(`<div id="gloss" class="s2 s22"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · S2 · BÖLÜM 2</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${GL.map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k">${k}</div><div class="eqs">=</div><div class="v">${v}</div></div>`).join('')}
    <div class="foot">İpucu: arama kutusundaki <b>önerilere</b> bakın</div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 48 30" style="width:440px;height:275px">
    <rect x="3" y="3" width="42" height="24" rx="3"/><path d="M8 10h22"/><path d="M8 16h30M8 21h24"/><circle cx="38" cy="10" r="3.2"/><path d="M40.3 12.3l2.6 2.6"/></svg>
    <div class="tt">Vitrindeki yazı</div><div class="ss">S2 · BÖLÜM 3 · BAŞLIK VE AÇIKLAMA</div></div>`);
  const kParts = [...next.querySelectorAll('svg path, svg circle, svg rect')];
  kParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Sezon 2 · Bölüm 2 · Müşterinin kelimeleri</div><div class="rule"></div>
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
  const SWAP = T.lYaz - 0.1;

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

    // ---- hook: your site's words; the customer's search; ≠
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    rowIn($p('kwSite'), t, T.h0 + 0.1, 0);
    $p('jw').classList.toggle('on-hl', pk(t, T.hKurumsal + 0.6, 0.5) > 0.4 || t > T.hAyni);
    rowIn($p('kwSrch'), t, T.hMus - 0.2, 0);
    $p('kq').textContent = typed('evden eve nakliyat', t, T.hEvden - 0.3, T.hYaziyor + 0.1);
    show($p('kcar'), t < T.hYaziyor + 0.3 && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
    RIV.forEach((_, k) => rowIn($p('kr' + k), t, T.hYaziyor + 0.2 + k * 0.1, 30));
    rowIn($p('kwMiss'), t, T.hYaziyor + 0.7, 30);
    $p('kq').parentElement.classList.toggle('on-hl', t > T.hAyni);
    const ne = outBack(prog(t, T.hAyni - 0.05, T.hAyni + 0.35), 2);
    show($p('kwNe'), clamp(ne * 3)); tf($p('kwNe'), `translate(-50%, -50%) scale(${lerp(0.3, 1, clamp(ne))}) rotate(${(1 - clamp(ne)) * -20}deg)`);

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
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tKelime - 0.5 + k * 0.15, T.tKelime + 0.3 + k * 0.15))); });

    // ---- bridge: the guide
    place(guidePin, A.hqTop, win(t, T.bRehber - 0.3, T.bSimdi + 0.6, 0.3, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.bRehber - 0.2)) });

    // ---- 01 the customer's words fly to the book; the light finds the shop's banner, not yours
    const sQ = city.project(A.searcher()), bQ = city.project(A.book);
    const qa = win(t, T.wYaz - 0.3, T.wEsle + 0.3, 0.3, 0.35);
    const qk = inOut(prog(t, T.wRehber, T.wEsle - 0.2));
    if (qa > 0.002 && !sQ.behind && !bQ.behind) {
      show(query, qa);
      tf(query, `translate(${lerp(sQ.x, bQ.x, qk)}px, ${lerp(sQ.y - 30, bQ.y, qk)}px) translate(-50%, -100%) scale(${lerp(lerp(0.6, 1, pop(t, T.wYaz - 0.2)), 0.45, qk)})`);
    } else show(query, 0);
    place(matchShop, A.shopBanner, win(t, T.wEsle + 0.3, T.wEnd + 0.4, 0.25, 0.35), { lift: 8, scale: lerp(0.6, 1, pop(t, T.wEsle + 0.4)) });
    place(noMatch, A.banner, win(t, T.wYoksa - 0.1, SWAP, 0.25, 0.3), { lift: 6, scale: lerp(0.6, 1, pop(t, T.wYoksa)) });
    place(matchYou, A.banner, win(t, SWAP + 0.6, T.lEnd + 0.3, 0.25, 0.35), { lift: 6, scale: lerp(0.6, 1, pop(t, SWAP + 0.7)) });

    // ---- 02 research: customers tell how they searched
    place(askQ, A.door, win(t, T.fSor - 0.2, T.fEnd + 0.3, 0.25, 0.35), { lift: 120, scale: lerp(0.6, 1, pop(t, T.fSor - 0.1)) });
    answers.forEach((e, k) => place(e, () => A.asker(k), win(t, T.fNasil + 0.4 + k * 0.25, T.fEnd + 0.5, 0.25, 0.35), { lift: 10 + (k % 2) * 52, scale: 0.9 * lerp(0.6, 1, pop(t, T.fNasil + 0.5 + k * 0.25)) }));

    // ---- long searches: rival signs and a browsing crowd; a long, precise search walks to your door
    rivalTags.forEach((e, k) => place(e, () => A.rival(k), win(t, T.n0 + 0.2 + k * 0.1, T.nEnd + 0.3, 0.25, 0.35), { lift: 6, scale: 0.72 * lerp(0.6, 1, pop(t, T.n0 + 0.3 + k * 0.1)) }));
    place(browsing, A.crowd, win(t, T.nBak - 0.2, T.nEnd + 0.3, 0.25, 0.35), { lift: 6, scale: lerp(0.6, 1, pop(t, T.nBak - 0.1)) });
    place(longQ, () => A.mover(0), win(t, T.nKarsi - 0.1, T.nEnd + 0.3, 0.25, 0.35), { lift: 66, scale: 0.85 * lerp(0.6, 1, pop(t, T.nKarsi)) });
    place(moving, () => A.mover(1), win(t, T.nTasin - 0.1, T.nEnd + 0.3, 0.25, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.nTasin)) });

    // ---- 03 one page, one topic; stuffing gets caught
    pageTags.forEach((e, k) => {
      const t0 = [T.pEvden, T.pOfis, T.pOfis + 0.6][k] - 0.1;
      const at = [{ lift: 10 }, { ax: 0, ay: 0.5, dx: 34, lift: 30 }, { ax: 1, ay: 0.5, dx: -34, lift: 30 }][k];
      place(e, () => A.pav(k), win(t, t0, T.pAyni - 0.2, 0.3, 0.35), { ...at, scale: lerp(0.6, 0.92, pop(t, t0 + 0.1)) });
    });
    place(oneTopic, A.heroTop, win(t, T.pTek - 0.1, T.pBaslik, 0.3, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.pTek)) });
    place(caught, A.banner, win(t, T.pFark - 0.1, T.pEnd + 0.5, 0.25, 0.35), { lift: 6, scale: lerp(0.6, 1, pop(t, T.pFark)) });

    // ---- recap
    place(recapPin, A.heroTop, win(t, T.xDil - 0.4, T.save - 0.1, 0.3, 0.35), { lift: 14, scale: lerp(0.6, 1, pop(t, T.xDil - 0.3)) });

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.w0 - 0.3, T.x0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.w0, T.f0 - 0.2), prog(t, T.f0, T.p0 - 0.2), prog(t, T.p0, T.pEnd)];
    const active = t < T.f0 ? 0 : t < T.p0 ? 1 : 2;
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
    const cardW = [[T.l0 + 0.2, T.lEnd + 0.3], [T.fKolay - 0.2, T.fSor - 0.3], [T.nYalniz - 0.3, T.nEnd + 0.3], [T.pBaslik - 0.4, T.pEnd + 0.3]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mLang: win(t, T.l0, T.lEnd + 0.6, 0.01, 0.01), mSug: win(t, T.fKolay - 0.5, T.fBenzer, 0.01, 0.25), mRel: win(t, T.fBenzer - 0.25, T.fSor, 0.25, 0.01),
      mCmp: win(t, T.nYalniz - 0.6, T.nEnd + 0.6, 0.01, 0.01), mPage: win(t, T.pBaslik - 0.7, T.pEnd + 0.6, 0.01, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      rowIn($r('lg0'), t, T.l0 + 0.5); rowIn($r('lg1'), t, T.lImplant - 0.1);
      $r('lg0').classList.toggle('on-hl', pk(t, SWAP + 0.3, 0.5) > 0.4); $r('lg1').classList.toggle('on-hl', pk(t, T.lEksik + 0.4, 0.5) > 0.4);
      show($r('lgNote'), smooth(prog(t, T.lEksik + 0.3, T.lEksik + 0.6)));
      $r('sgq').textContent = typed('nakliyat', t, T.fKutu - 0.1, T.fKutu + 0.7);
      show($r('sgcar'), t < T.fOneri && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
      SUG.forEach((_, k) => { const e = $r('sg' + k); rowIn(e, t, T.fKutu + 0.9 + k * 0.12, 20); e.classList.toggle('on-hl', t > T.fOneri + 0.2 && k === 1); });
      REL.forEach((_, k) => { const e = $r('rl' + k); rowIn(e, t, T.fBenzer + 0.1 + k * 0.1, 20); e.classList.toggle('on-hl', pk(t, T.fIpucu + 0.3 + k * 0.08, 0.3) > 0.4); });
      rowIn($r('cc0'), t, T.nYalniz - 0.1, 30); rowIn($r('cc1'), t, T.nKarsi - 0.1, 30);
      show($r('cn0'), smooth(prog(t, T.nBak - 0.1, T.nBak + 0.25))); show($r('cn1'), smooth(prog(t, T.nTasin - 0.1, T.nTasin + 0.25)));
      $r('cc1').classList.toggle('on-hl', t > T.nUzun + 0.1);
      [['pgT', T.pBaslik], ['pgH', T.pIlk], ['pgM', T.pMetin]].forEach(([id, w]) => { const e = $r(id); rowIn(e, t, w - 0.15, 30); e.classList.toggle('on-hl', pk(t, w + 0.3, 0.35) > 0.4); });
      const stf = smooth(prog(t, T.pAyni - 0.1, T.pAyni + 0.3));
      show($r('pgTxt'), 1 - stf); show($r('pgStuff'), stf);
      const pb = outBack(prog(t, T.pFark - 0.1, T.pFark + 0.3), 1.8); show($r('pgBad'), clamp(pb * 3)); tf($r('pgBad'), `scale(${lerp(0.7, 1, clamp(pb))})`);
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
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.15 * pk(t, SWAP + 0.2, 0.18));

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
