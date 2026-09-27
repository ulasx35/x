// Everything drawn over the 3D city: the phone, the "GERÇEKTE" (real life) card, term cards,
// chapter bar, labels pinned to the city, captions, title, glossary and end frame.
// Pure function of time: update(t) sets every style from scratch.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outExpo, outQuint, win, at, end } from './anim.js';
import { T } from './timeline.js';

// ------------------------------------------------------------------ icons (24×24 stroke)
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  store: '<path d="M4 10v10h16V10"/><path d="M3 4h18l-1 6H4z"/><path d="M10 20v-5h4v5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
  menu: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
  building: '<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  sign: '<path d="M12 3v18M5 6h12l2 2.5-2 2.5H5zM8 21h8"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  rewind: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };

const SITE = `<div class="site"><div class="nav"><div class="mk"><i></i>Websiteniz</div><div class="burger"></div></div>
  <div class="hero"></div><div class="txt"><div class="h1">Hoş geldiniz</div><div class="p" style="width:78%"></div><div class="p" style="width:56%"></div></div>
  <div class="btn">İletişim</div><div class="grid"><i></i><i></i><i></i><i></i></div></div>`;

const KEYS = ['qwertyuıopğü', 'asdfghjklşi', 'zxcvbnmöç'];

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;

  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');
  const pins = add('<div style="inset:0"></div>');
  const flyers = add('<div style="inset:0"></div>');

  // ---------------------------------------------------------------- phone
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer pad" id="pHome">
      <div class="pill" style="top:150px">${ic('search')}<span id="pQ"></span><i class="caret" id="pCaret"></i></div>
      <div style="position:absolute;left:36px;right:36px;top:250px;display:flex;flex-direction:column;gap:18px" id="pSugg">
        <div style="height:14px;border-radius:7px;background:#e3e7ef;width:70%"></div><div style="height:14px;border-radius:7px;background:#e3e7ef;width:54%"></div></div>
      <div class="kbd" id="pKbd">${KEYS.map((r) => `<div class="r">${[...r].map((k) => `<div class="k" data-k="${k}">${k}</div>`).join('')}</div>`).join('')}<div class="r"><div class="k space"></div></div></div>
    </div>
    <div class="layer pad" id="pRes" style="background:#f7f8fb">
      <div class="pill" style="top:120px">${ic('search')}<span>websiteniz</span></div>
      <div class="res" style="top:220px" id="pRes1"><div class="srow"><div class="fav">W</div><div><div class="nm">Websiteniz</div><div class="url">websiteniz.com</div></div></div>
        <div class="ttl">Websiteniz | Resmi Web Sitesi</div><div class="ln" style="width:92%"></div><div class="ln" style="width:70%"></div></div>
      <div class="res" style="top:520px;opacity:.55"><div class="ln" style="width:40%;margin:0"></div><div class="ln" style="width:80%;height:18px;background:#c9d6f5"></div><div class="ln" style="width:90%"></div></div>
      <div class="res" style="top:720px;opacity:.4"><div class="ln" style="width:35%;margin:0"></div><div class="ln" style="width:75%;height:18px;background:#c9d6f5"></div><div class="ln" style="width:85%"></div></div>
      <div class="ripple" id="pTap"></div>
    </div>
    <div class="layer" id="pPage" style="background:#f7f8fb">
      <div style="position:absolute;left:0;right:0;top:0;height:170px;background:#e7ebf3"></div>
      <div class="addr" style="position:absolute;left:24px;right:24px;top:96px;height:56px;font-size:24px">${ic('lock')}<span id="pAddr">websiteniz.com</span><i class="caret" id="pAddrCaret"></i></div>
      <div class="progress" id="pProg" style="top:168px"></div>
      <div style="position:absolute;left:0;right:0;top:172px;bottom:0" id="pSite">${SITE}</div>
    </div>
  </div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const pHome = $p('pHome'), pRes = $p('pRes'), pPage = $p('pPage'), pQ = $p('pQ'), pCaret = $p('pCaret'), pKbd = $p('pKbd');
  const pTap = $p('pTap'), pProg = $p('pProg'), pSite = $p('pSite'), pAddr = $p('pAddr'), pAddrCaret = $p('pAddrCaret');
  const keyEls = [...pKbd.querySelectorAll('.k[data-k]')];
  const timer = add(`<div id="timer">${ic('timer')}<span id="tv">0,0 sn</span></div>`);
  const tv = timer.querySelector('#tv');
  const rewind = add(`<div id="timer" style="background:rgba(10,15,27,.9);border:1px solid rgba(255,255,255,.18);box-shadow:none">${ic('rewind')}<span>1 saniye</span></div>`);

  // ---------------------------------------------------------------- GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mSearch">
      <div class="pill" style="top:78px;height:58px;font-size:24px">${ic('search')}<span>websiteniz</span></div>
      <div class="res" style="top:158px"><div class="srow"><div class="fav">W</div><div><div class="nm">Websiteniz</div><div class="url" id="mUrl">websiteniz.com</div></div></div>
        <div class="ttl">Websiteniz | Resmi Web Sitesi</div><div class="ln" style="width:92%"></div><div class="ln" style="width:66%"></div></div>
    </div>
    <div class="mode" id="mBar"><div class="browser" style="bottom:auto;height:300px"><div class="chrome"><div class="dots"><i></i><i></i><i></i></div>
      <div class="addr">${ic('lock')}<span id="mBarTxt"></span><i class="caret" id="mBarCaret"></i></div></div>
      <div style="padding:26px"><div style="height:120px;border-radius:16px;background:linear-gradient(135deg,#cdd7ea,#e6ecf6)"></div></div></div>
</div>
    <div class="mode" id="mAnat"><div class="anat" id="anat">
      <div class="col"><div class="big a">websiteniz</div><div id="aL1" style="align-self:stretch"><div class="brace"></div><div class="lb">İSİM<small>siz seçersiniz</small></div></div></div>
      <div class="col" id="aC2"><div class="big b">.com</div><div id="aL2" style="align-self:stretch"><div class="brace"></div><div class="lb">UZANTI<small>.com.tr · .net</small></div></div></div></div></div>
    <div class="mode" id="mEq">
      <div class="eq" style="top:92px" id="eq1"><div class="ico">${ic('store')}</div><div><div class="t1">Dükkanın adresi</div><div class="t2">Çınar Sokak No: 12</div></div></div>
      <div class="eqsign" style="top:222px" id="eqS">=</div>
      <div class="eq" style="top:290px" id="eq2"><div class="ico">${ic('globe')}</div><div><div class="t1">Sitenin adresi</div><div class="t2 mono">websiteniz.com</div></div></div>
    </div>
    <div class="mode" id="mSite"><div class="browser"><div class="chrome" style="height:74px"><div class="addr" style="height:48px;font-size:22px">${ic('lock')}<span>websiteniz.com</span></div></div>
      <div style="position:absolute;left:0;right:0;top:74px;bottom:0" id="mSiteBody">${SITE.replace('class="site"', 'class="site mini"').replace('<div class="btn">İletişim</div>', '')}</div></div></div>
    <div class="mode" id="mBook"><div class="contacts"><div class="hd">Rehber</div>
      ${[['Muhasebe', '#8a6cf0'], ['Ofis', '#1c73fd'], ['Tedarikçi', '#f08a4b'], ['Usta', '#2bb673']].map(([n, c], k) => `<div class="row" id="cr${k}"><div class="av" style="background:${c}">${n[0]}</div><div class="nm">${n}</div>${k === 1 ? '<div class="num" id="crNum">0212 000 00 00</div>' : ''}</div>`).join('')}
      <div class="ripple" id="bTap"></div>
      <div class="calling" id="bCall"><div class="av" id="bAv">O<div class="ripple" id="bRing1"></div><div class="ripple" id="bRing2"></div></div><div class="nm">Ofis</div><div class="st">aranıyor…</div><div class="num">0212 000 00 00</div></div>
    </div></div>
    <div class="mode" id="mRec"><div class="rec"><div class="cap">DNS KAYDI</div>
      <div class="box" id="recBox"><span class="nm">websiteniz.com</span><div class="l2">${ic('arrow')}<span class="ip" id="recIp">???</span></div></div>
      <div class="note" id="recNote">${ic('check')}<b>Güncellendi</b></div>
      <div class="note" id="recWave" style="margin-top:14px">${ic('globe')}<span>Dünyaya yayılıyor · birkaç saat</span></div>
      <div class="prog" id="recProg"><i></i></div></div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mSearch', 'mBar', 'mAnat', 'mEq', 'mSite', 'mBook', 'mRec'].map((k) => [k, $r(k)]));

  // tiles that leave the website and move into the servers
  const tiles = [['doc', 'Yazılar'], ['image', 'Fotoğraflar'], ['menu', 'Menü']].map(([i, n]) => add(`<div class="tile">${ic(i)}<span>${n}</span></div>`));
  // a copy of the address that flies from the card into the sign, and the DNS record into the gate
  const flyName = add('<div class="chip" style="background:#fff;color:#172033;border:0;font-size:30px">websiteniz.com</div>');
  const flyRec = add(`<div class="chip" style="font-size:24px">websiteniz.com ${ic('arrow')} <span style="color:#5b9cff">203.0.113.24</span></div>`);

  // ---------------------------------------------------------------- pins in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const stem = () => add('<div class="stem"></div>');
  const mk = { adres: pin('sign', 'ADRES'), bina: pin('building', 'BİNA'), yol: pin('route', 'YOL') };
  const mkStem = { adres: stem(), bina: stem(), yol: stem() };
  const pinSrv = pin('server', 'SUNUCU'), pinSrvStem = stem();
  const pin724 = add(`<div class="pin"><div class="ic2" id="dn">${ic('moon')}</div><span>7/24 AÇIK</span></div>`);
  const dn = pin724.querySelector('#dn');
  const pinSlice = add(`<div class="pin blue"><div class="ic2" style="background:#fff;color:#1c73fd">${ic('check')}</div><span style="letter-spacing:.04em">SİZİN ALANINIZ</span></div>`);
  const gateChip = add('<div class="chip">websiteniz.com <span class="q">?</span><i class="x"></i></div>');
  const gateX = gateChip.querySelector('.x'), gateQ = gateChip.querySelector('.q');
  const ipl = city.ipBuildings.map((b) => ({ ...b, e: add(`<div class="ipl">${b.ip}</div>`) }));
  const heroIp = add('<div class="ipl hero">203.0.113.24</div>');
  const newIp = add('<div class="ipl hero">198.51.100.42</div>');
  const sameChip = add(`<div class="pin blue"><div class="ic2" style="background:#fff;color:#1c73fd">${ic('check')}</div><span style="letter-spacing:.04em">ADRES AYNI</span></div>`);
  const rc = { d: pin('sign', 'DOMAIN', 'blue'), n: pin('route', 'DNS', 'blue'), h: pin('building', 'HOSTING', 'blue') };

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· 01</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'ADRES'], ['02', 'BİNA'], ['03', 'YOL']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub) => add(`<div class="sect"><div class="num">${n}</div><div class="name">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'ADRES', 'Domain'), t: T.d1 },
    { e: sect('02', 'BİNA', 'Hosting'), t: T.h2 },
    { e: sect('03', 'YOL', 'DNS'), t: T.n3 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('DOMAIN', 'alan adı', 'Sitenizin internetteki adresi.'), w: [[T.dTerm - 0.1, T.dName - 0.3]] },
    { e: term('HOSTING', 'barındırma', 'Sitenizin dosyalarının durduğu, sunucuda kiraladığınız alan.'), w: [[T.hTerm - 0.1, T.hAll + 0.2], [T.hRent0 - 0.1, T.hBina + 1.2]] },
    { e: term('IP ADRESİ', 'sunucunun numarası', 'Her sunucunun kendine ait numarası. Örn. 203.0.113.24'), w: [[T.iIP - 0.15, T.nTerm - 0.35]] },
    { e: term('DNS', 'alan adı sistemi', 'İnternetin rehberi: ismi numaraya çevirir.'), w: [[T.nTerm - 0.1, T.nBook + 1.6]] },
  ];

  // ---------------------------------------------------------------- title, glossary, next, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">BÖLÜM 01</div><div class="rule"></div>
    <div class="parts"><div>${ic('sign')}ADRES</div><div>${ic('building')}BİNA</div><div>${ic('route')}YOL</div></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tParts = [...title.querySelectorAll('.parts div')];

  const gloss = add(`<div id="gloss"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · SÖZLÜK</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${[['sign', 'Domain', 'Adresiniz'], ['building', 'Hosting', 'Binanız'], ['route', 'DNS', 'Yol tarifiniz']].map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k">${k}</div><div class="eqs">=</div><div class="v">${v}</div></div>`).join('')}
    <div class="foot">${ic('server')}<span>IP adresi = binanın numarası</span></div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" id="lk1"/><path d="M8 11V8a4 4 0 0 1 8 0v3" id="lk2"/><path d="M12 15v2.5" id="lk3"/></svg>
    <div class="tt">Kapınızdaki kilit</div><div class="ss">SSL · HTTPS</div></div>`);
  const lockParts = ['lk1', 'lk2', 'lk3'].map((id) => next.querySelector('#' + id));
  lockParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Bölüm 1 · Adres, bina ve yol</div><div class="rule"></div>
    <img src="../assets/fentra-logo.png" alt=""><div class="h">@fentra.digital</div></div>`);
  const eT = endf.querySelector('.t'), eS = endf.querySelector('.s'), eRule = endf.querySelector('.rule'), eLogo = endf.querySelector('img'), eH = endf.querySelector('.h');
  const flash = add('<div id="flash"></div>');

  // ---------------------------------------------------------------- captions
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
  const blink = (t) => (Math.floor(t * 2.2) % 2 === 0 ? 1 : 0.15);

  // ================================================================ per frame
  function update(t) {
    // ---- canvas focus, darkness at the very start
    const hookDark = 1 - smooth(prog(t, T.perde - 0.25, T.perde + 0.45));
    show(dark, hookDark);
    const blurTitle = 5 * win(t, T.title - 0.3, T.titleEnd + 0.25, 0.5, 0.45);
    const blurOut = 9 * smooth(prog(t, T.gDomain - 0.6, T.gDomain + 0.3)) * (1 - 0.35 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6)));
    const blurPhone = 3 * win(t, T.r0 - 0.2, T.rEnd + 0.3, 0.5, 0.5);
    const blurDive = 10 * (1 - smooth(prog(t, T.perde - 0.1, T.perde + 0.7))) * (t > T.perde - 0.6 ? 1 : 0);
    const bl = blurTitle + blurOut + blurPhone + blurDive;
    const br = 1 - 0.35 * smooth(prog(t, T.gDomain - 0.6, T.gDomain + 0.3)) - 0.2 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6));
    canvas.style.filter = bl > 0.05 || br < 0.999 ? `blur(${bl.toFixed(2)}px) brightness(${br.toFixed(3)})` : 'none';
    show(vig, 0.6 + 0.4 * win(t, T.title - 0.2, T.titleEnd + 0.3) + 0.4 * smooth(prog(t, T.gDomain - 0.6, T.gDomain)));
    show(shadeTop, t > T.perde ? 1 : 0);
    show(shadeBot, 0.85 + 0.15 * smooth(prog(t, T.gDomain - 0.6, T.gDomain)));

    // ---- phone: hook
    const hookA = smooth(prog(t, -0.2, 0.25)) * (1 - smooth(prog(t, T.perde + 0.15, T.perde + 0.55)));
    const recapA = win(t, T.r0 - 0.35, T.rEnd + 0.45, 0.55, 0.45);
    if (t < 40) {
      const push = lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 1.12, inOut(prog(t, T.dive0, T.perde - 0.2)));
      const zoom = Math.pow(lerp(1, 7.5, Math.pow(prog(t, T.perde - 0.25, T.perde + 0.55), 2.2)), 1);
      show(phone, hookA);
      tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${push * zoom})`);
      // home + typing
      const q = typed('websiteniz', t, T.type0 + 0.05, T.type1 - 0.08);
      pQ.textContent = q; show(pCaret, blink(t));
      const kIdx = q.length - 1, kOn = t < T.type1 + 0.05 ? q[kIdx] : null;
      keyEls.forEach((k) => k.classList.toggle('on', k.dataset.k === kOn && (t - (T.type0 + 0.05 + (kIdx + 0.5) * (T.type1 - T.type0 - 0.13) / 10)) < 0.09));
      const resK = outCubic(prog(t, T.results - 0.15, T.results + 0.3));
      show(pHome, 1 - resK * 0.999); tf(pKbd, `translateY(${resK * 360}px)`);
      show(pRes, resK); tf(pRes, `translateY(${(1 - resK) * 60}px)`);
      // tap
      const tapK = prog(t, T.tap - 0.05, T.tap + 0.45);
      show(pTap, tapK > 0 && tapK < 1 ? 1 - tapK : 0);
      Object.assign(pTap.style, { left: `${240 - 20 - tapK * 90}px`, top: `${330 - 20 - tapK * 90}px`, width: `${40 + tapK * 180}px`, height: `${40 + tapK * 180}px` });
      $p('pRes1').style.transform = `scale(${1 - 0.03 * win(t, T.tap - 0.05, T.tap + 0.25, 0.08, 0.15)})`;
      // page
      const pgK = outCubic(prog(t, T.tap + 0.2, T.tap + 0.55));
      show(pPage, pgK); tf(pPage, `translateX(${(1 - pgK) * 80}px)`);
      pAddr.textContent = 'websiteniz.com'; show(pAddrCaret, 0);
      const load = prog(t, T.tap + 0.3, T.pageOpen);
      pProg.style.width = `${outExpo(load) * 100}%`; show(pProg, 1 - smooth(prog(t, T.pageOpen, T.pageOpen + 0.3)));
      show(pSite, smooth(prog(t, T.tap + 0.55, T.pageOpen))); tf(pSite, `translateY(${(1 - outCubic(prog(t, T.tap + 0.55, T.pageOpen))) * 30}px)`);
    } else {
      // recap: a smaller phone on the left, the city on the right
      show(phone, recapA);
      tf(phone, `translate(${-178 + (1 - outCubic(prog(t, T.r0 - 0.35, T.r0 + 0.3))) * -300}px, 180px) scale(0.6)`);
      show(pHome, 0); show(pRes, 0); show(pPage, 1); tf(pPage, 'none');
      const q = typed('websiteniz.com', t, T.rType, T.rType + 0.75);
      pAddr.textContent = q; show(pAddrCaret, t < T.rType + 0.9 ? blink(t) : 0);
      const load = prog(t, T.rDns, T.rOpen + 0.2);
      pProg.style.width = `${outExpo(load) * 100}%`; show(pProg, t > T.rDns && t < T.rOpen + 0.5 ? 1 : 0);
      show(pSite, smooth(prog(t, T.rOpen - 0.1, T.rOpen + 0.35))); tf(pSite, `translateY(${(1 - outCubic(prog(t, T.rOpen - 0.1, T.rOpen + 0.35))) * 30}px)`);
    }
    // "bir saniye bile sürmez" timer, and the rewind chip in the recap
    const tmA = win(t, T.sec - 0.35, T.perde - 0.3, 0.3, 0.4);
    show(timer, tmA); tf(timer, `translate(540px, ${278 - (1 - outBack(prog(t, T.sec - 0.35, T.sec + 0.1))) * 30}px) translate(-50%, 0) scale(${lerp(0.8, 1, outBack(prog(t, T.sec - 0.35, T.sec + 0.1)))})`);
    tv.textContent = `${(0.8 * outCubic(prog(t, T.sec - 0.25, T.sec + 0.35))).toFixed(1).replace('.', ',')} sn`;
    const rwA = win(t, T.r0 - 0.1, T.rType - 0.1, 0.3, 0.3);
    show(rewind, rwA); tf(rewind, `translate(540px, 300px) translate(-50%, 0) rotate(${0}deg) scale(${lerp(0.85, 1, outBack(prog(t, T.r0 - 0.1, T.r0 + 0.3)))})`);
    rewind.querySelector('svg').style.transform = `rotate(${-360 * outCubic(prog(t, T.r0 - 0.1, T.r0 + 0.9))}deg)`;

    // flash at the dive
    show(flash, 0.55 * Math.exp(-Math.pow((t - T.perde - 0.25) / 0.22, 2)));

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
    [T.tAdres, T.tBina, T.tYol].forEach((w, k) => {
      const kk = prog(t, w - 0.12, w + 0.28);
      show(tParts[k], kk * 3); tf(tParts[k], `translateY(${(1 - outCubic(kk)) * 30}px) scale(${lerp(0.7, 1, outBack(kk, 2))})`);
      tParts[k].style.borderColor = `rgba(91,156,255,${0.9 * Math.exp(-Math.pow((t - w - 0.25) / 0.35, 2)) + 0.16})`;
    });

    // ---- hook markers in the city (ADRES / BİNA / YOL)
    const mA = win(t, T.three - 0.15, T.titleEnd + 0.3, 0.3, 0.4) * (1 - 0.75 * win(t, T.title - 0.1, T.titleEnd, 0.2, 0.2));
    [['adres', city.anchors.signA, T.three - 0.1, T.tAdres], ['bina', city.anchors.heroMid, T.three + 0.12, T.tBina], ['yol', [-30, 1, 14], T.three + 0.34, T.tYol]].forEach(([k, a, t0, hi]) => {
      const kk = prog(t, t0, t0 + 0.4), pulse = 1 + 0.18 * Math.exp(-Math.pow((t - hi - 0.2) / 0.25, 2));
      const aa = mA * kk;
      place(mk[k], a, aa, { lift: 120 * outBack(kk, 1.5), scale: lerp(0.6, 1, outBack(kk, 1.8)) * pulse });
      placeStem(mkStem[k], a, aa * 0.9, 110 * outCubic(kk));
    });

    // ---- chapter bar and series tag
    const chapA = win(t, T.titleEnd + 0.2, T.r0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.d1, T.h2 - 0.3), prog(t, T.h2, T.i0), prog(t, T.n3, T.mEnd)];
    const active = t < T.h2 ? 0 : t < T.n3 ? 1 : 2;
    segs.forEach((s, k) => { s.bar.style.width = `${fills[k] * 100}%`; s.lab.style.color = k === active ? '#f4f7ff' : k < active ? 'rgba(244,247,255,0.62)' : 'rgba(244,247,255,0.34)'; });

    // ---- section intros
    sections.forEach(({ e, t: s0 }) => {
      const a = win(t, s0 - 0.12, s0 + 2.1, 0.25, 0.45);
      show(e, a);
      const kin = outQuint(prog(t, s0 - 0.12, s0 + 0.5)), kout = inOut(prog(t, s0 + 1.65, s0 + 2.1));
      tf(e, `translate(${(1 - kin) * -70 + kout * -40}px, ${kout * -40}px)`);
      e.querySelector('.name').style.clipPath = `inset(0 ${(1 - outCubic(prog(t, s0, s0 + 0.55))) * 100}% 0 0)`;
      e.querySelector('.sub i').style.width = `${56 * outCubic(prog(t, s0 + 0.2, s0 + 0.7))}px`;
    });

    // ---- term cards
    terms.forEach(({ e, w }) => {
      let a = 0, kin = 1;
      for (const [a0, a1] of w) { const aa = win(t, a0, a1, 0.3, 0.35); if (aa > a) { a = aa; kin = outQuint(prog(t, a0, a0 + 0.45)); } }
      show(e, a); tf(e, `translateX(${(1 - kin) * -60}px)`);
      e.style.setProperty('--x', 1);
    });

    // ---- GERÇEKTE card
    const cardW = [[T.dGoogle - 0.2, T.dEnd + 0.45], [T.hTerm + 0.15, T.hAll + 0.85], [T.nBook - 0.25, T.nConv + 0.75], [T.mOnly - 0.35, T.mEnd + 0.35]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mSearch: win(t, T.dGoogle - 0.2, T.dBar + 0.25, 0.01, 0.25),
      mBar: win(t, T.dBar + 0.05, T.dName + 0.9, 0.25, 0.3),
      mAnat: win(t, T.dName + 0.75, T.dShop + 0.15, 0.3, 0.3),
      mEq: win(t, T.dShop - 0.1, T.dEnd + 0.6, 0.3, 0.01),
      mSite: win(t, T.hTerm, T.hAll + 1, 0.01, 0.01),
      mBook: win(t, T.nBook - 0.3, T.nDns + 0.05, 0.01, 0.25),
      mRec: Math.max(win(t, T.nDns - 0.15, T.nConv + 0.9, 0.3, 0.01), win(t, T.mOnly - 0.4, T.mEnd + 0.5, 0.01, 0.01)),
    };
    for (const k in modes) show(modes[k], mw[k]);

    if (cardA > 0) {
      // search result: the address lights up
      const u = $r('mUrl'), hk = prog(t, T.dGoogle + 0.35, T.dGoogle + 0.6);
      u.classList.toggle('on-hl', hk > 0.3);
      u.style.color = hk > 0.3 ? '#1c73fd' : '#4d5566'; u.style.fontWeight = hk > 0.3 ? '700' : '400';
      // address bar typing
      const bt = typed('websiteniz.com', t, T.dBar + 0.3, T.dName - 0.2);
      const barTxt = $r('mBarTxt'); barTxt.textContent = bt;
      barTxt.style.opacity = t > T.dName ? 1 - 0.6 * smooth(prog(t, T.dName, T.dName + 0.2)) : 1;
      show($r('mBarCaret'), t < T.dName ? blink(t) : 0);
      barTxt.parentElement.classList.toggle('on-hl', t > T.dName - 0.35 && t < T.dName + 0.35);
      // anatomy: name | extension
      const an = outCubic(prog(t, T.dName + 0.9, T.dName + 1.5));
      show($r('aL1'), smooth(prog(t, T.dName + 0.9, T.dName + 1.4))); show($r('aL2'), smooth(prog(t, T.dName + 1.15, T.dName + 1.65)));
      $r('anat').style.gap = `${34 * an}px`;
      // shop address = site address
      const e1 = outQuint(prog(t, T.dShop - 0.1, T.dShop + 0.35)), e2 = outQuint(prog(t, T.dSite - 0.1, T.dSite + 0.35));
      show($r('eq1'), e1); tf($r('eq1'), `translateX(${(1 - e1) * 40}px)`);
      show($r('eqS'), smooth(prog(t, T.dSite - 0.3, T.dSite))); tf($r('eqS'), `scale(${lerp(0.4, 1, outBack(prog(t, T.dSite - 0.3, T.dSite + 0.1), 2))})`);
      show($r('eq2'), e2); tf($r('eq2'), `translateX(${(1 - e2) * 40}px)`);
      // website → its files
      const sb = $r('mSiteBody');
      [['.txt', T.hYazi], ['.grid', T.hFoto], ['.burger', T.hMenu]].forEach(([q, w0]) => sb.querySelector(q).classList.toggle('on-hl', t > w0 - 0.12 && t < T.hAll + 0.3));
      // contacts → calling
      const tk = prog(t, T.nTap - 0.05, T.nTap + 0.5), bTap = $r('bTap');
      Object.assign(bTap.style, { left: `${90 - tk * 70}px`, top: `${230 - tk * 70}px`, width: `${40 + tk * 140}px`, height: `${40 + tk * 140}px` });
      show(bTap, tk > 0 && tk < 1 ? 1 - tk : 0);
      $r('cr1').style.background = t > T.nTap ? `rgba(28,115,253,${0.14 * (1 - prog(t, T.nFind, T.nFind + 0.3))})` : 'transparent';
      const numK = smooth(prog(t, T.nMemo - 0.1, T.nMemo + 0.3));
      show($r('crNum'), numK);
      const callK = outCubic(prog(t, T.nFind - 0.05, T.nFind + 0.35));
      show($r('bCall'), callK); tf($r('bCall'), `translateY(${(1 - callK) * 40}px)`);
      [['bRing1', 0], ['bRing2', 0.5]].forEach(([id, o]) => {
        const r = $r(id), ph = ((t - T.nFind + o) % 1 + 1) % 1, s = 110 + ph * 120;
        Object.assign(r.style, { left: `${55 - s / 2}px`, top: `${55 - s / 2}px`, width: `${s}px`, height: `${s}px` });
        show(r, t > T.nFind ? (1 - ph) * 0.8 : 0);
      });
      // DNS record: name → number; later the number is updated
      const ipEl = $r('recIp');
      if (t < T.mOnly - 1) {
        const k = prog(t, T.nConv - 0.1, T.nConv + 0.45);
        ipEl.textContent = k <= 0 ? '???' : k >= 1 ? '203.0.113.24' : scramble('203.0.113.24', k, t);
        ipEl.style.color = k >= 1 ? '#5b9cff' : '#9aa7c0';
      } else {
        const k = prog(t, T.mNum - 0.05, T.mNum + 0.5);
        ipEl.textContent = k <= 0 ? '203.0.113.24' : k >= 1 ? '198.51.100.42' : scramble('198.51.100.42', k, t);
      }
      const recBox = $r('recBox');
      recBox.style.borderColor = `rgba(91,156,255,${0.12 + 0.8 * Math.exp(-Math.pow((t - T.nConv - 0.5) / 0.3, 2)) + 0.8 * Math.exp(-Math.pow((t - T.mUpd - 0.1) / 0.3, 2))})`;
      recBox.style.opacity = t > T.nGo - 0.9 && t < T.nConv + 1 ? 1 - smooth(prog(t, T.nConv + 0.45, T.nConv + 0.6)) : 1;
      show($r('recNote'), t > T.mOnly - 1 ? smooth(prog(t, T.mUpd - 0.1, T.mUpd + 0.25)) : 0);
      show($r('recWave'), t > T.mOnly - 1 ? smooth(prog(t, T.mWave - 0.1, T.mWave + 0.3)) : 0);
      show($r('recProg'), t > T.mOnly - 1 ? smooth(prog(t, T.mWave - 0.1, T.mWave + 0.3)) : 0);
      $r('recProg').firstElementChild.style.width = `${72 * outCubic(prog(t, T.mWave, T.mEnd + 0.4))}%`;
    }

    // ---- flying: address → sign
    const fk = prog(t, T.dName - 0.05, T.dName + 0.6);
    if (fk > 0 && fk < 1) {
      const from = center($r('mBarTxt')), to = city.project(city.anchors.sign());
      const k = inOut(fk);
      show(flyName, fk < 0.85 ? 1 : 1 - (fk - 0.85) / 0.15);
      tf(flyName, `translate(${lerp(from.x, to.x, k)}px, ${lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * 140}px) translate(-50%, -50%) scale(${lerp(1, 0.55, k)})`);
    } else show(flyName, 0);
    // DNS record → the gate, becoming the route
    const rk = prog(t, T.nConv + 0.45, T.nConv + 1.0);
    if (rk > 0 && rk < 1) {
      const from = center($r('recBox')), to = city.project(city.anchors.gate);
      const k = inOut(rk);
      show(flyRec, rk < 0.8 ? 1 : 1 - (rk - 0.8) / 0.2);
      tf(flyRec, `translate(${lerp(from.x, to.x, k)}px, ${lerp(from.y, to.y, k)}px) translate(-50%, -50%) scale(${lerp(1, 0.4, k)})`);
    } else show(flyRec, 0);

    // ---- tiles: out of the website, into the servers
    const tSlots = [[250, 330], [250, 510], [250, 690]], tTimes = [T.hYazi, T.hFoto, T.hMenu];
    const sbody = $r('mSiteBody'), tFrom = ['.txt', '.grid', '.burger'].map((q) => { const c = center(sbody.querySelector(q)); return [c.x, c.y]; });
    const srv = city.project(city.anchors.servers);
    tiles.forEach((e, k) => {
      const kin = outBack(prog(t, tTimes[k] - 0.05, tTimes[k] + 0.4), 1.3);
      const kfly = inOut(prog(t, T.hAll + 0.05 + k * 0.12, T.hAll + 0.8 + k * 0.12));
      const a = smooth(prog(t, tTimes[k] - 0.05, tTimes[k] + 0.2)) * (1 - smooth(prog(t, T.hAll + 0.6 + k * 0.12, T.hAll + 0.85 + k * 0.12)));
      show(e, a);
      if (a <= 0) return;
      let x = lerp(tFrom[k][0], tSlots[k][0], kin), y = lerp(tFrom[k][1], tSlots[k][1], kin);
      x = lerp(x, srv.x, kfly); y = lerp(y, srv.y - 40, kfly) - Math.sin(kfly * Math.PI) * 120;
      tf(e, `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${lerp(lerp(0.4, 1, clamp(kin)), 0.25, kfly)}) rotate(${(1 - clamp(kin)) * -8}deg)`);
    });

    // ---- pins in the city
    const dayK = win(t, T.hGunduz - 0.25, T.hPc + 0.95, 0.55, 0.9);
    dn.innerHTML = ic(dayK > 0.5 ? 'sun' : 'moon');
    const a724 = win(t, T.hGece - 0.2, T.hSunucu + 0.1, 0.3, 0.3);
    place(pin724, city.anchors.servers, a724, { dx: -150, lift: 60, scale: lerp(0.7, 1, outBack(prog(t, T.hGece - 0.2, T.hGece + 0.2))) });
    const aSrv = win(t, T.hSunucu - 0.1, T.hRent0 + 0.9, 0.25, 0.35), kSrv = outBack(prog(t, T.hSunucu - 0.1, T.hSunucu + 0.3), 1.6);
    place(pinSrv, city.anchors.servers, aSrv, { lift: 30 + 100 * kSrv, scale: lerp(0.6, 1, kSrv) });
    placeStem(pinSrvStem, city.anchors.servers, aSrv, 100 * kSrv);
    const aSl = win(t, T.hRent - 0.15, T.hBina + 0.35, 0.25, 0.3), kSl = outBack(prog(t, T.hRent - 0.15, T.hRent + 0.3), 1.6);
    place(pinSlice, city.anchors.slice, aSl, { ax: 0, ay: 0.5, dx: 60, scale: lerp(0.6, 1, kSl) });

    // gate: the name that computers can't use
    const aG = win(t, T.i0 + 0.3, T.nDns + 0.2, 0.3, 0.3);
    place(gateChip, city.anchors.gate, aG, { lift: 30 + Math.sin(t * 3) * 6, scale: lerp(0.7, 1, outBack(prog(t, T.i0 + 0.3, T.i0 + 0.7))) });
    const xK = outCubic(prog(t, at('ip', 2, 'değil') - 0.05, at('ip', 2, 'değil') + 0.25));
    tf(gateX, `scaleX(${xK})`); show(gateX, xK);
    gateQ.style.transform = `rotate(${Math.sin(t * 4) * 10}deg)`;
    // house numbers (IP addresses) on the buildings
    ipl.forEach((b, k) => {
      const t0 = T.iNums - 0.1 + k * 0.06;
      const a = win(t, t0, T.nBook + 0.2, 0.25, 0.4);
      place(b.e, b.p, a, { lift: 8, scale: lerp(0.5, 1, outBack(prog(t, t0, t0 + 0.35), 2)) });
    });
    const heroOn = prog(t, T.iEvery + 0.3, T.iEvery + 0.7);
    const aHero = Math.max(win(t, T.iNums + 0.2, T.nBook + 0.2, 0.25, 0.4) * lerp(0.9, 1, heroOn), win(t, T.nArrive - 0.1, T.m0 + 2.2, 0.3, 0.5));
    place(heroIp, city.anchors.heroTop, aHero * (t > T.mNum ? 0.3 : 1), { lift: 14, scale: lerp(0.62, 1, outBack(heroOn, 2)) * (1 + 0.12 * Math.exp(-Math.pow((t - T.iIP - 0.2) / 0.3, 2))) });
    heroIp.style.background = heroOn > 0.5 ? '' : 'rgba(8,12,22,0.82)';
    const aNew = win(t, T.mNum - 0.1, T.mEnd + 0.6, 0.3, 0.4);
    place(newIp, city.anchors.newTop, aNew, { lift: 14, scale: lerp(0.6, 1, outBack(prog(t, T.mNum - 0.1, T.mNum + 0.3), 2)) });
    // moving: the address travels with you
    const aSame = win(t, T.mSame - 0.15, T.mOnly + 0.2, 0.25, 0.3);
    place(sameChip, city.anchors.sign, aSame, { lift: 40, scale: lerp(0.6, 1, outBack(prog(t, T.mSame - 0.15, T.mSame + 0.25), 1.6)) });
    // recap tags
    [[rc.d, city.anchors.signB, T.rType], [rc.n, () => city.anchors.route2Head(), T.rDns], [rc.h, city.anchors.newTop, T.rHost]].forEach(([e, a, t0]) => {
      const k = outBack(prog(t, t0 - 0.1, t0 + 0.3), 1.6);
      place(e, a, win(t, t0 - 0.1, T.rEnd + 0.45, 0.2, 0.35), { lift: 30, scale: lerp(0.5, 1, k) });
    });

    // ---- glossary, save, next episode, end frame
    const gA = win(t, T.gDomain - 0.45, T.next - 0.05, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, T.gDomain - 0.45, T.gDomain + 0.1))) * 60}px) translateX(${-inOut(prog(t, T.next - 0.45, T.next - 0.05)) * 120}px)`);
    [T.gDomain, T.gHosting, T.gDns].forEach((w, k) => {
      const kk = outQuint(prog(t, w - 0.1, w + 0.35));
      show(gRows[k], kk); tf(gRows[k], `translateX(${(1 - kk) * 50}px)`);
      gRows[k].style.borderColor = `rgba(91,156,255,${0.12 + 0.7 * Math.exp(-Math.pow((t - w - 0.3) / 0.35, 2))})`;
    });
    show(gFoot, smooth(prog(t, T.gDns + 0.9, T.gDns + 1.3)));
    const sv = prog(t, T.save - 0.05, T.save + 0.3);
    bmPath.style.fill = sv > 0.3 ? '#1c73fd' : 'transparent'; bmPath.style.stroke = sv > 0.3 ? '#1c73fd' : 'currentColor';
    tf(bm, `scale(${1 + 0.35 * Math.sin(clamp(sv) * Math.PI)})`);
    bm.style.borderColor = sv > 0.3 ? '#1c73fd' : 'rgba(255,255,255,0.25)';
    bm.style.boxShadow = sv > 0.3 ? '0 0 40px rgba(28,115,253,0.6)' : 'none';
    const sl = win(t, T.save, T.next - 0.1, 0.25, 0.3);
    show(saveLbl, sl); tf(saveLbl, `translate(${1010 - 196}px, ${538 - 30 * outBack(prog(t, T.save, T.save + 0.35), 2)}px) translate(-100%, -100%)`);

    const nA = win(t, T.next - 0.2, T.endCard - 0.05, 0.35, 0.35);
    show(next, nA); tf(next, `translateX(${(1 - outQuint(prog(t, T.next - 0.2, T.next + 0.3))) * 100}px)`);
    lockParts.forEach((p, k) => { const L = +p.dataset.len; p.style.strokeDashoffset = L * (1 - outCubic(prog(t, T.lock - 0.45 + k * 0.18, T.lock + 0.35 + k * 0.18))); });

    const eA = smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3));
    show(endf, eA);
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));

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
      const a = smooth(prog(t, c.start - 0.12, c.start + 0.05)) * (1 - smooth(prog(t, c.hide - 0.14, c.hide)));
      show(cap, a); tf(cap, `translateY(${(1 - outCubic(prog(t, c.start - 0.12, c.start + 0.1))) * 14}px)`);
      capWords.forEach((e, k) => {
        const w = cues.words[c.words[k]];
        const on = t >= w.start - 0.03, cur = on && t < w.end + 0.02;
        e.style.color = cur ? '#6aa8ff' : '#ffffff';
        e.style.opacity = on ? 1 : 0.42;
      });
    } else show(cap, 0);
  }

  return { update };
}

function scramble(target, k, t) {
  const n = Math.floor(k * target.length);
  let s = target.slice(0, n);
  for (let i = n; i < target.length; i++) s += target[i] === '.' ? '.' : String(Math.floor((Math.sin(i * 12.9 + Math.floor(t * 30) * 7.1) * 0.5 + 0.5) * 10));
  return s;
}
