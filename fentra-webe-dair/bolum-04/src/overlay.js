// Episode 4 overlays: the phone that never loads, the "GERÇEKTE" card, term cards, chapter bar, labels pinned to the
// city, captions, title, glossary and end frame. Pure function of time.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outQuint, win, hash } from './anim.js';
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
  queue: '<circle cx="5" cy="7" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="19" cy="7" r="2"/><path d="M2.5 19v-4a2.5 2.5 0 0 1 5 0v4M9.5 19v-4a2.5 2.5 0 0 1 5 0v4M16.5 19v-4a2.5 2.5 0 0 1 5 0v4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="16" cy="9" r="1.8"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  door: '<path d="M5 21V4h11v17M3 21h18M13 12h.01"/>',
  net: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5L6.5 17M12 11.5l5.5 5.5"/>',
  exit: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };
const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
const num = (x, d = 1) => x.toFixed(d).replace('.', ',');

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;
  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');

  // ---------------------------------------------------------------- phone (hook): an ad, a tap, a page that never opens
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer feed" id="feed"><div class="fh2">Keşfet</div>
      <div class="post"><div class="ph2"><div class="fav">W</div><div><b>Websiteniz</b><span>Sponsorlu</span></div></div>
        <div class="adimg"><div class="adtxt"><small>YENİ SEZON</small><b>%40</b><span>indirim</span></div></div>
        <div class="adbtn" id="adBtn">Hemen incele<i>›</i></div><div class="tap" id="tap"></div></div>
      <div class="post ghost"><div class="ph2"><div class="fav" style="background:#c9cfdb"></div><div><b>••••••</b><span>2 sa</span></div></div><div class="adimg" style="background:#e3e7ef"></div></div>
    </div>
    <div class="layer" id="load" style="background:#ffffff"><div class="bbar"><div class="addr2">${ic('lock')}<span>websiteniz.com</span></div><div class="lprog"><i id="lprog"></i></div></div>
      <div class="spin" id="spin"></div></div>
  </div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const timer = add(`<div id="timer">${ic('clock')}<span id="tmv">0,0 sn</span></div>`);
  const tmv = timer.querySelector('#tmv');
  const qBubble = add('<div id="qBubble">?</div>');

  // ---------------------------------------------------------------- the GERÇEKTE card
  const RED53 = [...Array(100).keys()].sort((a, b) => hash(a * 1.37 + 0.2) - hash(b * 1.37 + 0.2)).slice(0, 53);
  const real = add(`<div id="real">
    <div class="mode" id="mStat"><div class="stat"><div class="sh">${ic('user')}<span>Telefondan gelen <b>100</b> ziyaretçi</span></div>
      <div class="dots">${[...Array(100)].map((_, i) => `<i id="d${i}"></i>`).join('')}</div>
      <div class="wait"><span>Bekleme</span><div class="wb"><i id="wbar"></i><em></em><u>3 sn</u></div><b id="wsec">0,0 sn</b></div></div>
      <div class="sbanner bad" id="stBan">${ic('exit')}<span><b>53</b> kişi beklemeden çıktı</span></div></div>
    <div class="mode" id="mRank"><div class="pill" style="top:84px">${ic('search')}<span>spor ayakkabı</span></div>
      <div class="rk2" id="rkA"><div class="fav">W</div><div class="rt"><span class="mono">websiteniz.com</span><b>Spor ayakkabı modelleri</b></div><em class="slow">${ic('clock')}6,8 sn</em></div>
      <div class="rk2" id="rkB"><div class="fav" style="background:linear-gradient(135deg,#1f9d55,#5fe39a)">H</div><div class="rt"><span class="mono">hizlisite.com</span><b>Spor ayakkabı · Yeni sezon</b></div><em class="fast">${ic('bolt')}1,2 sn</em></div>
      <div class="rkup" id="rkUp">${ic('bolt')}<span>Hızlı site öne çıkar</span></div></div>
    <div class="mode" id="mFile"><div class="file"><div class="thumb" id="thumb"><i></i></div>
      <div class="fi"><span class="mono" id="fName">IMG_4021.jpg</span><b id="fSize">6,4 MB</b><small id="fDim">4032 × 3024 piksel</small></div></div>
      <div class="meter" id="m1"><div class="ml"><span>Sayfa ağırlığı</span><b id="pw">7,2 MB</b></div><div class="mb"><i id="pwBar"></i></div></div>
      <div class="meter" id="m2"><div class="ml"><span>Açılış süresi</span><b id="lt">8,1 sn</b></div><div class="mb"><i id="ltBar"></i></div></div></div>
    <div class="mode" id="mHost"><div class="panel"><div class="ph">${ic('server')}<span id="hName">Paylaşımlı sunucu</span><em id="hTag" class="badt">Kalabalık</em></div>
      <div class="prow hp"><span>Bu sunucudaki siteler</span><b id="hSites">1</b></div>
      <div class="prow hp"><span>Sunucu yanıt süresi</span><b id="hResp">1,8 sn</b></div>
      <div class="prow hp"><span>Kaynak</span><b id="hRes">Ortak</b></div></div>
      <div class="sbanner" id="hOk">${ic('bolt')}<span>Ayrılmış kaynak, hızlı yanıt</span></div></div>
    <div class="mode" id="mTest"><div class="ptest"><div class="ttl2">${ic('gauge')}<span>Hız testi</span></div>
      <div class="tf"><span class="mono" id="tUrl"></span><i class="caret" id="tCaret"></i><div class="tbtn" id="tBtn">Analiz et</div></div>
      <div class="tres"><div class="ringw"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="rbg"/><circle cx="60" cy="60" r="50" class="rfg" id="rfg"/></svg><b id="tScore">0</b><small>/ 100</small></div>
        <div class="issues">${['Görseller çok büyük', 'Sunucu yanıtı yavaş', 'CDN kullanılmıyor'].map((s, k) => `<div class="iss" id="is${k}"><i>${ic('check')}</i><span>${s}</span></div>`).join('')}</div></div></div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mStat', 'mRank', 'mFile', 'mHost', 'mTest'].map((k) => [k, $r(k)]));
  const dotEls = [...Array(100).keys()].map((i) => $r('d' + i));
  const redAt = new Map(RED53.map((d, r) => [d, r]));

  // ---------------------------------------------------------------- pins in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const stem = () => add('<div class="stem"></div>');
  const mk = { adres: pin('sign', 'ADRES'), bina: pin('building', 'BİNA'), yol: pin('route', 'YOL'), kilit: pin('lock', 'KİLİT'), posta: pin('mailbox', 'POSTA') };
  const mkStem = { adres: stem(), bina: stem(), yol: stem(), kilit: stem(), posta: stem() };
  const queueQ = add('<div class="chip" style="font-family:Manrope;font-weight:800">KUYRUK <span class="q">?</span></div>');
  const exitPin = add(`<div class="chip warnchip">${ic('exit')}<span>Beklemeden çıktı</span></div>`);
  const shopPin = pin('door', 'YAN DÜKKAN');
  const cratePin = add(`<div class="chip" id="cratePin">${ic('image')}<span id="cpTxt">6,4 MB</span></div>`);
  const cpTxt = cratePin.querySelector('#cpTxt');
  const sitesPin = add(`<div class="chip warnchip">${ic('server')}<span id="spTxt">312 site · tek sunucu</span></div>`);
  const doorPin = add(`<div class="chip warnchip">${ic('door')}<span>TEK KAPI</span></div>`);
  const widePin = pin('bolt', 'GENİŞ KAPI', 'blue');
  const visPin = add(`<div class="chip">${ic('user')}<span>Uzaktaki ziyaretçi</span></div>`);
  const farPin = add(`<div class="chip warnchip">${ic('clock')}<span>Uzun yol</span></div>`);
  const mainPin = pin('building', 'ANA BİNA');
  const brPins = [0, 1, 2, 3].map(() => add(`<div class="chip" style="font-family:Manrope;font-weight:800;font-size:24px;letter-spacing:.1em">${ic('net')}<span>ŞUBE</span></div>`));
  const nearPin = pin('check', 'EN YAKIN ŞUBE', 'blue');
  const scorePin = add('<div class="chip" id="scorePin" style="font-family:Manrope;font-weight:800;font-size:44px;padding:10px 26px">0</div>');

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· 04</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'KUYRUK'], ['02', 'SEBEPLER'], ['03', 'ÇÖZÜM']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub, size = 104) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:${size}px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'KUYRUK', 'Yavaş site'), t: T.w0 },
    { e: sect('02', 'SEBEPLER', 'Görseller · Hosting', 84), t: T.i0 },
    { e: sect('03', 'ÇÖZÜM', 'CDN · Hız testi'), t: T.c0 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('SİTE HIZI', '', 'Sayfanın telefonda açılma süresi. Hedef: 3 saniyenin altı.'), w: [[T.wYavas - 0.2, T.wSonra - 0.1]] },
    { e: term('CDN', 'içerik dağıtım ağı', 'Sitenizi ziyaretçiye en yakın sunucudan açar.'), w: [[T.cCdn - 0.2, T.cHerkes - 0.1]] },
  ];

  // ---------------------------------------------------------------- title, glossary, next, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">BÖLÜM 04</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.queue}</svg><span>Kapınızdaki kuyruk</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path, #tIcon circle')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const gloss = add(`<div id="gloss"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · SÖZLÜK</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${[['queue', 'Yavaş site', 'Kapıdaki kuyruk'], ['bolt', 'Görsel · Hosting · CDN', 'Kuyruğu eriten üç çözüm'], ['gauge', 'Hız testi', 'Sitenizin karnesi']].map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k" style="width:auto;font-size:28px;white-space:nowrap">${k}</div><div class="eqs">=</div><div class="v" style="font-size:26px;white-space:nowrap">${v}</div></div>`).join('')}
    <div class="foot">${ic('clock')}<span>Hedef: telefonda <b>3 saniyenin</b> altında açılış.</span></div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 48 24" style="width:420px;height:210px">
    <rect x="3" y="3" width="20" height="18" rx="2.5"/><circle cx="13" cy="12" r="4.2"/><path d="M13 7.8v2M13 14.2v2M8.8 12h2M15.2 12h2"/>
    <circle cx="31" cy="12" r="4.4"/><path d="M35.4 12H46M42.5 12v3.6M45.5 12v2.6"/></svg>
    <div class="tt">Yedek anahtar</div><div class="ss">YEDEKLEME</div></div>`);
  const kParts = [...next.querySelectorAll('svg path, svg circle, svg rect')];
  kParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Bölüm 4 · Kapınızdaki kuyruk</div><div class="rule"></div>
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
  const typed = (txt, t, a, b) => txt.slice(0, Math.round(clamp((t - a) / (b - a)) * txt.length));
  const pop = (t, a, s = 1.8) => outBack(prog(t, a - 0.12, a + 0.3), s);
  const tapT = T.tik - 0.15;

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

    // ---- hook
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    $p('feed').style.transform = `translateY(${-40 * inOut(prog(t, 0.1, tapT - 0.2))}px)`;
    show($p('load'), smooth(prog(t, T.tik + 0.05, T.tik + 0.35)));
    const tk = prog(t, tapT, tapT + 0.45);
    show($p('tap'), (tk > 0 && tk < 1) ? 1 - tk : 0); tf($p('tap'), `translate(-50%, -50%) scale(${lerp(0.3, 2.2, outCubic(tk))})`);
    $p('adBtn').style.background = t > tapT && t < tapT + 0.35 ? '#0f4fc0' : '';
    const el0 = Math.max(0, t - (T.tik + 0.15));
    $p('lprog').style.width = `${6 + 32 * (1 - Math.exp(-el0 / 1.4))}%`;
    tf($p('spin'), `translate(-50%, -50%) rotate(${t * 330}deg)`);
    const tA = win(t, T.tik + 0.1, T.hookEnd + 0.2, 0.2, 0.3);
    show(timer, tA); tf(timer, `translate(540px, 228px) translate(-50%, 0) scale(${lerp(0.7, 1, pop(t, T.tik + 0.25)) * (1 + 0.12 * pk(t, T.tik + 3.15, 0.2))})`);
    tmv.textContent = `${num(el0)} sn`;
    timer.style.background = el0 > 3 ? '#d93025' : '';
    timer.style.boxShadow = el0 > 3 ? '0 20px 60px rgba(217,48,37,0.55)' : '';
    const qa = win(t, T.kac - 0.1, T.hookEnd + 0.25, 0.2, 0.25);
    show(qBubble, qa); tf(qBubble, `translate(820px, 640px) translate(-50%, -50%) scale(${lerp(0.4, 1, pop(t, T.kac, 2.2))}) rotate(${Math.sin(t * 5) * 6}deg)`);

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
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tKuyruk - 0.5 + k * 0.08, T.tKuyruk + 0.2 + k * 0.08))); });

    // ---- bridge pins and the queue
    const mA = win(t, T.bAdres - 0.2, T.bPeki + 0.2, 0.25, 0.4);
    [['adres', city.anchors.sign, T.bAdres], ['bina', city.anchors.heroTop, T.bBina], ['yol', [-20, 1, 14], T.bYol], ['kilit', city.anchors.lock, T.bKilit], ['posta', city.anchors.mailbox, T.bPosta]].forEach(([k, a, t0]) => {
      const kk = prog(t, t0 - 0.1, t0 + 0.3);
      place(mk[k], a, mA * kk, { lift: 100 * outBack(kk, 1.5), scale: lerp(0.6, 1, outBack(kk, 1.8)) * (1 + 0.15 * pk(t, t0 + 0.2, 0.25)) });
      placeStem(mkStem[k], a, mA * kk * 0.9, 90 * outCubic(kk));
    });
    place(queueQ, city.anchors.queueMid, win(t, T.bKuyruk - 0.1, T.w0 + 0.2, 0.25, 0.3), { lift: 40 + Math.sin(t * 3) * 6, scale: lerp(0.7, 1, pop(t, T.bKuyruk)) });

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.w0 - 0.3, T.r0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.w0, T.i0 - 0.2), prog(t, T.i0, T.c0 - 0.2), prog(t, T.c0, T.xEnd)];
    const active = t < T.i0 ? 0 : t < T.c0 ? 1 : 2;
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
    const cardW = [[T.wYari - 0.5, T.wEnd + 0.3], [T.iSebep - 0.3, T.iEnd + 0.3], [T.hUcuz - 0.3, T.hEnd + 0.3], [T.x0 + 0.2, T.r0 - 0.15]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mStat: win(t, T.wYari - 0.6, T.wGoogle, 0.01, 0.3),
      mRank: win(t, T.wGoogle - 0.2, T.wEnd + 0.6, 0.3, 0.01),
      mFile: win(t, T.iSebep - 0.4, T.iEnd + 0.6, 0.01, 0.01),
      mHost: win(t, T.hUcuz - 0.4, T.hEnd + 0.6, 0.01, 0.01),
      mTest: win(t, T.x0, T.r0 + 0.5, 0.01, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      // waiting: past 3 seconds, more than half of the visitors leave
      const secs = 3 * prog(t, T.wYari - 0.4, T.wUc + 0.25) + 1.3 * prog(t, T.wUc + 0.25, T.wKapat + 0.3);
      $r('wsec').textContent = `${num(secs)} sn`; $r('wsec').style.color = secs > 3 ? '#ff8a80' : '';
      $r('wbar').style.width = `${(secs / 4.5) * 100}%`; $r('wbar').style.background = secs > 3 ? '#ff5a52' : '';
      dotEls.forEach((d, i) => {
        const r = redAt.get(i);
        const on = r !== undefined && t > T.wUc + 0.25 + (r / 53) * (T.wKapat - T.wUc);
        d.classList.toggle('red', on);
      });
      const bk = outBack(prog(t, T.wKapat - 0.05, T.wKapat + 0.3), 1.8);
      show($r('stBan'), bk * 3); tf($r('stBan'), `scale(${lerp(0.7, 1, bk)})`);
      // ranking: the fast site moves up
      const sw = inOut(prog(t, T.wOne - 0.15, T.wOne + 0.45));
      tf($r('rkA'), `translateY(${sw * 150}px)`); tf($r('rkB'), `translateY(${-sw * 150}px)`);
      $r('rkB').classList.toggle('on-hl', t > T.wOne + 0.3);
      show($r('rkUp'), smooth(prog(t, T.wOne + 0.3, T.wOne + 0.7)));
      // the photo: heavy, then compressed
      const cmp = inOut(prog(t, T.iKucuk, T.iSikis + 0.3));
      const small = cmp > 0.5;
      $r('fName').textContent = small ? 'urun.webp' : 'IMG_4021.jpg';
      const kb = lerp(6400, 180, cmp);
      $r('fSize').textContent = kb >= 1000 ? `${num(kb / 1000)} MB` : `${Math.round(kb)} KB`;
      $r('fSize').style.color = small ? '#1f9d55' : '#d93025';
      $r('fDim').textContent = small ? '1200 × 900 piksel' : '4032 × 3024 piksel';
      $r('fSize').classList.toggle('on-hl', pk(t, T.iAgir + 0.2, 0.4) > 0.4);
      tf($r('thumb').querySelector('i'), `scale(${lerp(1, 0.62, cmp)})`);
      const pw = lerp(7.2, 1.0, cmp), lt = lerp(8.1, 1.9, cmp);
      $r('pw').textContent = `${num(pw)} MB`; $r('lt').textContent = `${num(lt)} sn`;
      $r('pwBar').style.width = `${(pw / 7.2) * 100}%`; $r('ltBar').style.width = `${(lt / 8.1) * 100}%`;
      [['pw', 'pwBar'], ['lt', 'ltBar']].forEach(([a, b]) => { $r(a).style.color = small ? '#5fe39a' : '#ff8a80'; $r(b).style.background = small ? '#37d67a' : '#ff5a52'; });
      show($r('m1'), smooth(prog(t, T.iFoto - 0.2, T.iFoto + 0.2))); show($r('m2'), smooth(prog(t, T.iAgir - 0.2, T.iAgir + 0.2)));
      // the shared server, then a good one
      const good = t > T.hKalite + 0.1;
      $r('hName').textContent = good ? 'Kaliteli hosting' : 'Paylaşımlı sunucu';
      $r('hTag').textContent = good ? 'Hızlı' : 'Kalabalık'; $r('hTag').className = good ? 'goodt' : 'badt';
      $r('hSites').textContent = good ? 'Sadece siz' : String(Math.max(1, Math.round(312 * outCubic(prog(t, T.hYuz - 0.2, T.hPay + 0.3)))));
      $r('hResp').textContent = good ? '0,2 sn' : '1,8 sn'; $r('hResp').style.color = good ? '#1f9d55' : '#d93025';
      $r('hRes').textContent = good ? 'Ayrılmış' : 'Ortak';
      $r('hSites').classList.toggle('on-hl', pk(t, T.hYuz + 0.6, 0.6) > 0.4);
      const ok = outBack(prog(t, T.hGenis - 0.05, T.hGenis + 0.3), 1.8);
      show($r('hOk'), ok * 3); tf($r('hOk'), `scale(${lerp(0.7, 1, ok)})`);
      // the speed test
      $r('tUrl').textContent = typed('websiteniz.com', t, T.xAdres - 0.3, T.xAdres + 0.6);
      show($r('tCaret'), t < T.xPuan - 0.3 && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
      $r('tBtn').style.background = t > T.xAdres + 0.7 && t < T.xAdres + 1.0 ? '#0f4fc0' : '';
      const sc = city.score(t);
      $r('tScore').textContent = String(Math.round(sc));
      const col = sc < 50 ? '#ff5a52' : sc < 90 ? '#ffb020' : '#37d67a';
      $r('tScore').style.color = col; $r('rfg').style.stroke = col; $r('rfg').style.strokeDashoffset = `${314.16 * (1 - sc / 100)}`;
      [0, 1, 2].forEach((k) => {
        const e = $r('is' + k), a0 = T.xNeyin - 0.1 + k * 0.22;
        const kk = outQuint(prog(t, a0, a0 + 0.35)); show(e, kk); tf(e, `translateX(${(1 - kk) * 30}px)`);
        e.classList.toggle('ok', t > T.xGor - 0.1 + k * 0.3);
      });
    }

    // ---- pins
    place(exitPin, city.anchors.leavers, win(t, T.wKapat - 0.1, T.wYavas + 0.2, 0.2, 0.3), { lift: 40, scale: lerp(0.6, 1, pop(t, T.wKapat)) });
    place(shopPin, city.anchors.shop, win(t, T.wYan - 0.2, T.wGoogle + 0.6, 0.25, 0.3), { lift: 60, scale: lerp(0.6, 1, pop(t, T.wYan)) });
    const cpA = win(t, T.iGorsel + 0.1, T.iHizli + 0.4, 0.3, 0.3);
    const cSmall = t > (T.iKucuk + T.iSikis) / 2 + 0.2;
    cpTxt.textContent = cSmall ? '180 KB' : '6,4 MB';
    cratePin.style.background = cSmall ? 'rgba(31,157,85,0.95)' : 'rgba(217,48,37,0.95)';
    show(cratePin, 0);   // the crate's own label carries the size
    place(sitesPin, city.anchors.heroFace, win(t, T.hYuz + 0.2, T.hKalite + 0.3, 0.3, 0.3), { lift: 0, dx: -40, scale: lerp(0.6, 1, pop(t, T.hYuz + 0.4)) });
    place(doorPin, city.anchors.door, win(t, T.hKapi - 0.1, T.hGenis - 0.05, 0.2, 0.2), { lift: 30, scale: lerp(0.6, 1, pop(t, T.hKapi)) });
    place(widePin, city.anchors.door, win(t, T.hGenis + 0.2, T.hEnd + 0.3, 0.25, 0.3), { lift: 40, scale: lerp(0.6, 1, pop(t, T.hGenis + 0.3)) });
    place(visPin, () => city.anchors.farV(0).setY(0), win(t, T.cUzak - 0.3, T.cCdn + 0.2, 0.25, 0.3), { ax: 1, ay: 0, dx: 10, lift: -30, scale: lerp(0.6, 1, pop(t, T.cUzak - 0.2)) });
    place(farPin, [21, 2, 14], win(t, T.cUzak + 0.9, T.cCdn + 0.2, 0.25, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.cUzak + 1.0)) });
    place(mainPin, city.anchors.heroTop, win(t, T.cKopya - 0.3, T.cEnd + 0.2, 0.25, 0.3), { lift: 40, scale: 0.85 * lerp(0.6, 1, pop(t, T.cKopya - 0.2)) });
    brPins.forEach((e, k) => { const b0 = T.cKopya - 0.4 + k * 0.32 + 1.5; place(e, () => city.anchors.branch(k), win(t, b0, T.cEnd + 0.2, 0.25, 0.3) * (k === 0 && t > T.cYakin ? 0 : 1), { lift: 20, scale: 0.85 * lerp(0.6, 1, pop(t, b0)) }); });
    place(nearPin, () => city.anchors.branch(0).setY(0), win(t, T.cYakin, T.cEnd + 0.2, 0.2, 0.3), { ay: 0, lift: -24, scale: 0.85 * lerp(0.6, 1, pop(t, T.cYakin + 0.1)) });
    const scv = city.score(t);
    scorePin.textContent = String(Math.round(scv));
    scorePin.style.background = scv < 50 ? 'rgba(217,48,37,0.95)' : scv < 90 ? 'rgba(214,138,0,0.95)' : 'rgba(31,157,85,0.95)';
    place(scorePin, city.anchors.gauge, win(t, T.xPuan - 0.1, T.r0 - 0.2, 0.25, 0.3), { lift: 10, scale: lerp(0.6, 1, pop(t, T.xPuan)) * (1 + 0.15 * pk(t, T.xEnd + 0.4, 0.3)) });

    // ---- glossary, save, next, end
    const gA = win(t, T.r0 - 0.45, T.next - 0.05, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, T.r0 - 0.45, T.r0 + 0.1))) * 60}px) translateX(${-inOut(prog(t, T.next - 0.45, T.next - 0.05)) * 120}px)`);
    [T.gYavas, T.gHafif, T.gCdn + 1.0].forEach((w, k) => {
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
    kParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.yedek - 0.6 + k * 0.08, T.yedek + 0.1 + k * 0.08))); });
    show(endf, smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3)));
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.18 * pk(t, T.hGenis + 0.25, 0.18));

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
