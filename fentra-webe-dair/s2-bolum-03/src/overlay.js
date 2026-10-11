// Season 2, episode 3 overlays: the phone (a results page of shop windows), the "GERÇEKTE" card, the title ruler, labels
// pinned to the city, term cards, chapter bar, captions, title, the episode card and end frame. Pure function of time.
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
  window: '<rect x="3" y="4" width="18" height="15" rx="2"/><path d="M3 9h18M7 13h6M7 16h10"/>',
  tap: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9" opacity=".5"/>',
  title: '<path d="M4 6h16M12 6v13M8 19h8"/>',
  note: '<path d="M5 3.5h10l4 4v13H5z"/><path d="M8 11h8M8 14.5h8M8 18h5"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6 8v3M9.5 8v4.5M13 8v3M16.5 8v4.5"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.2 8.2L20 20M8.2 15.8L20 4"/>',
  door: '<path d="M5 21V4h14v17M3 21h18"/><circle cx="15" cy="12.5" r="1"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
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

  // ---------------------------------------------------------------- phone (hook): a results page, each result a shop window
  const SERP = [['hizlitasima.com', 'Evden Eve Nakliyat | Hızlı Taşıma', 'Sigortalı taşımacılık, ücretsiz ekspertiz. Hemen teklif alın.'],
    ['ekonakliyat.com', 'Ekonomik Evden Eve Nakliyat', 'Uygun fiyat, profesyonel ekip, asansörlü taşıma.'],
    ['nakliyatfiyat.com', 'Nakliyat Fiyatları 2026 · Karşıyaka', 'Fiyatınızı hesaplayın, 5 dakikada teklif alın.'],
    ['websiteniz.com', 'Anasayfa', ''],
    ['sehirici.com', 'Şehir İçi Nakliyat', 'Parça eşya ve ev taşıma, aynı gün hizmet.']];
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer serp3"><div class="sq">${ic('search')}<span>evden eve nakliyat</span></div>
      ${SERP.map(([u, ti, de], k) => `<div class="sn3 ${u === 'websiteniz.com' ? 'mine' : ''}" id="sn${k}"><div class="su"><i>${u[0].toUpperCase()}</i><span>${u}</span></div><b>${ti}</b><p>${de || '&nbsp;'}</p></div>`).join('')}
      <div class="tapDot" id="tapDot"></div>
    </div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const qBubble = add('<div id="qBubble">?</div>');

  // ---------------------------------------------------------------- the GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mAnat"><div class="an3"><div class="su"><i>W</i><span>websiteniz.com</span></div>
      <div class="anT" id="anT"><b>Karşıyaka'da Evden Eve Nakliyat, Sigortalı ve Asansörlü</b><em>BAŞLIK</em></div>
      <div class="anD" id="anD"><p>Ücretsiz keşif, aynı gün taşıma ve tek telefonla randevu. Karşıyaka'da sigortalı, asansörlü evden eve nakliyat.</p><em>AÇIKLAMA</em></div>
      <div class="anV" id="anV">${ic('window')}<span>Bu iki satır = vitrininiz</span></div></div></div>
    <div class="mode" id="mPanel"><div class="cms"><div class="cmsH">${ic('gear')}<span>Sayfa ayarları</span><small>/evden-eve-nakliyat</small></div>
      <div class="cmsL">Sayfa başlığı</div><div class="cmsF" id="cmsT"></div>
      <div class="cmsL">Açıklama</div><div class="cmsF tall" id="cmsD"></div>
      <div class="cmsP" id="cmsP"><small>ARAMA ÖNİZLEMESİ</small><b>Evden Eve Nakliyat · Karşıyaka | Websiteniz</b><p>Ücretsiz keşif, aynı gün taşıma, tek telefonla randevu.</p></div></div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mAnat', 'mPanel'].map((k) => [k, $r(k)]));

  // ---------------------------------------------------------------- around your board: the title ruler, the reasons, Google's pick
  const ruler = add(`<div id="ruler"><div class="rbar"><i id="rFill"></i><u id="rOver"></u></div>
    <div class="rticks">${[0, 15, 30, 45, 60].map((n) => `<span style="left:${n / 80 * 100}%">${n}</span>`).join('')}</div><div class="rcount" id="rCount">0 karakter</div></div>`);
  const rFill = ruler.querySelector('#rFill'), rOver = ruler.querySelector('#rOver'), rCount = ruler.querySelector('#rCount');
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const chip = (icon, text, extra = '') => add(`<div class="chip" style="font-family:Manrope;font-weight:800;${extra}">${ic(icon)}<span>${text}</span></div>`);
  const warn = (icon, text) => add(`<div class="chip warnchip">${ic(icon)}<span>${text}</span></div>`);
  const GREEN = 'background:rgba(31,157,85,0.95)', GREY = 'background:rgba(40,46,60,0.92);color:#aab4c8', BLUEB = 'background:rgba(28,115,253,0.95)';
  const vitrinPin = pin('window', 'VİTRİNİNİZ', 'blue');
  const looks = chip('eye', 'Sadece vitrine bakar', GREY);
  const noNote = warn('note', 'Açıklama boş');
  const randomNote = warn('note', 'Rastgele cümle');
  const passed = chip('arrow', 'Önünden geçti', GREY);
  const what = chip('title', 'NE: Evden eve nakliyat', BLUEB);
  const where = chip('pin', 'NEREDE: Karşıyaka', BLUEB);
  const first = chip('key', 'Önemli kelime başta', GREEN);
  const cutChip = warn('cut', 'Sonu kesildi…');
  const WHY = ['Ücretsiz keşif', 'Aynı gün taşıma', 'Tek telefonla randevu'];
  const whys = WHY.map((s) => chip('check', s, GREEN));
  const count150 = chip('note', '~150 karakter', BLUEB);
  const picked = chip('search', 'Google kendi seçti', GREY);
  const yours = chip('check', 'Sizin notunuz gösterildi', GREEN);
  const PT = ['Evden Eve Nakliyat · Karşıyaka', 'Ofis Taşıma · Karşıyaka', 'Eşya Depolama · Karşıyaka'];
  const pageTags = PT.map((s) => add(`<div class="chip ptag3">${ic('title')}<span>${s}</span></div>`));
  const stops = chip('window', 'Başlık durdurur', BLUEB);
  const invites = chip('door', 'Açıklama davet eder', GREEN);

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· S2 · 03</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'VİTRİN'], ['02', 'BAŞLIK'], ['03', 'AÇIKLAMA']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub, size = 104) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:${size}px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'VİTRİN', 'İki satır'), t: T.w0 },
    { e: sect('02', 'BAŞLIK', 'Ne ve nerede?'), t: T.t0, d: 1.3 },   // short: the NE chip takes its place
    { e: sect('03', 'AÇIKLAMA', 'Neden siz?', 92), t: T.a0 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('VİTRİN', '', 'Arama sonucundaki başlık ve açıklama.'), w: [[T.wVitrin - 0.2, T.wYalniz + 0.6]] },
    { e: term('AÇIKLAMA', '', 'Başlığın altındaki kısa not: neden siz?'), w: [[T.aNot - 0.3, T.aNeden + 0.4]] },
  ];

  // ---------------------------------------------------------------- title, episode card, next episode, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">SEZON 2 · BÖLÜM 03</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.window}</svg><span>Vitrindeki yazı</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path, #tIcon rect')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const GL = [['title', 'Başlık', 'Vitrindeki büyük yazı'], ['note', 'Açıklama', 'Vitrindeki küçük not'], ['ruler', '~60 karakter', 'Başlık sığar'], ['ruler', '~150 karakter', 'Açıklama sığar']];
  const gloss = add(`<div id="gloss" class="s2 s22"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · S2 · BÖLÜM 3</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${GL.map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k">${k}</div><div class="eqs">=</div><div class="v">${v}</div></div>`).join('')}
    <div class="foot">Her sayfaya <b>farklı</b> başlık ve açıklama</div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 48 30" style="width:440px;height:275px">
    <path d="M4 27h40"/><rect x="6" y="5" width="16" height="22"/><path d="M6 12h16M6 19h16"/><path d="M28 27v-8h14v8"/><path d="M26 19h18"/><circle cx="35" cy="12" r="3"/><path d="M33 16h4"/></svg>
    <div class="tt">Dükkanın içi</div><div class="ss">S2 · BÖLÜM 4 · İÇERİK</div></div>`);
  const kParts = [...next.querySelectorAll('svg path, svg circle, svg rect')];
  kParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Sezon 2 · Bölüm 3 · Vitrindeki yazı</div><div class="rule"></div>
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
  const TITLE0 = T.tOrn + 0.2, CUT0 = T.tUzun - 0.1, CUT1 = T.tEnd + 0.3, PICK0 = T.aGoogle - 0.1, PICK1 = T.aIyi + 0.2;

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

    // ---- hook: shop windows side by side; two lines each; a tap; yours says "Anasayfa"
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    SERP.forEach((_, k) => { const e = $p('sn' + k); rowIn(e, t, T.vOn - 0.3 + k * 0.12, 30); e.classList.toggle('lines', pk(t, T.vIki + 0.3 + k * 0.08, 0.35) > 0.4); });
    const tap = outBack(prog(t, T.vSec - 0.1, T.vSec + 0.2), 2);
    show($p('tapDot'), win(t, T.vSec - 0.1, T.vSizin, 0.1, 0.3) * clamp(tap * 3)); tf($p('tapDot'), `scale(${lerp(0.4, 1, clamp(tap))})`);
    $p('sn1').classList.toggle('tapped', t > T.vSec);
    $p('sn3').classList.toggle('on-hl', t > T.vSizin - 0.1);
    const qa = win(t, T.vSizin + 0.4, T.hookEnd + 0.25, 0.2, 0.25);
    show(qBubble, qa); tf(qBubble, `translate(820px, 1000px) translate(-50%, -50%) scale(${lerp(0.4, 1, pop(t, T.vSizin + 0.5, 2.2))}) rotate(${Math.sin(t * 5) * 6}deg)`);

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
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tVitrin - 0.5 + k * 0.15, T.tVitrin + 0.3 + k * 0.15))); });

    // ---- bridge and 01: your window; people only look at windows
    place(vitrinPin, A.board, win(t, T.bVitrin - 0.1, T.wEnd, 0.3, 0.35), { lift: 8, scale: lerp(0.6, 1, pop(t, T.bVitrin)) });
    place(looks, A.sidewalk, win(t, T.wYalniz - 0.2, T.wEnd + 0.3, 0.25, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.wYalniz - 0.1)) });

    // ---- "Anasayfa": the note is empty or random; people walk past
    place(noNote, A.boardLow, win(t, T.dBos - 0.2, T.dRast - 0.2, 0.25, 0.25), { ay: 0, lift: -18, scale: lerp(0.6, 1, pop(t, T.dBos - 0.1)) });
    place(randomNote, A.boardLow, win(t, T.dRast - 0.1, T.dBoyle + 0.4, 0.25, 0.35), { ay: 0, lift: -18, scale: lerp(0.6, 1, pop(t, T.dRast)) });
    place(passed, A.sidewalk, win(t, T.dGecer - 0.3, T.dEnd + 0.4, 0.25, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.dGecer - 0.2)) });

    // ---- 02 the title: what and where; the key word first; the ruler; too long gets cut
    place(what, A.boardL, win(t, T.tNe + 0.15, T.tEn, 0.25, 0.35), { ax: 0, ay: 1, dx: 10, lift: 160, scale: lerp(0.6, 0.9, pop(t, T.tNe + 0.25)) });
    place(where, A.boardR, win(t, T.tNerede - 0.1, T.tEn, 0.25, 0.35), { ax: 1, ay: 1, dx: -10, lift: 100, scale: lerp(0.6, 0.9, pop(t, T.tNerede)) });
    place(first, A.boardL, win(t, T.tBasa - 0.1, T.tUzun, 0.25, 0.35), { ax: 0, ay: 1, dx: 10, lift: 160, scale: lerp(0.6, 0.9, pop(t, T.tBasa)) });
    const rA = win(t, T.tAltmis - 0.4, T.tEnd + 0.5, 0.3, 0.35);
    const sL = city.project(A.boardL), sR = city.project(A.boardR), sLow = city.project(A.boardLow);
    if (rA > 0.002 && !sL.behind) {
      show(ruler, rA);
      ruler.style.width = `${Math.max(200, sR.x - sL.x)}px`;
      tf(ruler, `translate(${sL.x}px, ${sLow.y + 24}px)`);
      const long = t > CUT0 ? smooth(prog(t, CUT0, CUT0 + 0.6)) : 0;
      const n = Math.round(lerp(0, 54, outCubic(prog(t, T.tAltmis - 0.3, T.tAltmis + 0.5))) + 26 * long);
      rFill.style.width = `${Math.min(n, 60) / 80 * 100}%`; rOver.style.width = `${Math.max(0, n - 60) / 80 * 100}%`;
      rFill.classList.toggle('ok', n <= 60); rCount.textContent = `${n} karakter`; rCount.classList.toggle('bad', n > 60);
    } else show(ruler, 0);
    place(cutChip, A.boardR, win(t, T.tKesil - 0.15, T.tEnd + 0.4, 0.25, 0.35), { ax: 1, ay: 1, dx: -10, lift: 100, scale: lerp(0.6, 0.95, pop(t, T.tKesil - 0.05)) });

    // ---- 03 the description: three reasons; ~150 characters; Google sometimes picks its own
    whys.forEach((e, k) => place(e, A.boardLow, win(t, [T.aKesif, T.aGun, T.aTel][k] - 0.15, T.aYuz + 0.3, 0.25, 0.35), { ay: 0, lift: -24 - k * 70, scale: lerp(0.6, 0.95, pop(t, [T.aKesif, T.aGun, T.aTel][k] - 0.05)) }));
    place(count150, A.boardLow, win(t, T.aYuz - 0.1, PICK0, 0.25, 0.3), { ay: 0, lift: -24, scale: lerp(0.6, 0.95, pop(t, T.aYuz)) });
    place(picked, A.boardLow, win(t, PICK0, PICK1, 0.2, 0.25), { ay: 0, lift: -24, scale: lerp(0.6, 0.95, pop(t, PICK0 + 0.1)) });
    place(yours, A.boardLow, win(t, T.aSizin - 0.2, T.aEnd + 0.4, 0.25, 0.35), { ay: 0, lift: -24, scale: lerp(0.6, 0.95, pop(t, T.aSizin - 0.1)) });

    // ---- every page its own pair
    pageTags.forEach((e, k) => {
      const t0 = T.pFark - 0.3 + k * 0.25, at = [{ lift: 10 }, { ax: 0, ay: 0.5, dx: 34, lift: 30 }, { ax: 1, ay: 0.5, dx: -34, lift: 30 }][k];
      place(e, () => A.pav(k), win(t, t0, T.pEnd + 0.3, 0.3, 0.35), { ...at, scale: lerp(0.6, 0.9, pop(t, t0 + 0.1)) });
    });

    // ---- recap
    place(stops, A.board, win(t, T.xDur - 0.3, T.save - 0.1, 0.25, 0.35), { lift: 8, scale: lerp(0.6, 1, pop(t, T.xDur - 0.2)) });
    place(invites, A.boardLow, win(t, T.xDavet - 0.3, T.save - 0.1, 0.25, 0.35), { ay: 0, lift: -26, scale: lerp(0.6, 1, pop(t, T.xDavet - 0.2)) });

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.w0 - 0.3, T.x0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.w0, T.t0 - 0.2), prog(t, T.t0, T.a0 - 0.2), prog(t, T.a0, T.pEnd)];
    const active = t < T.t0 ? 0 : t < T.a0 ? 1 : 2;
    segs.forEach((s, k) => { s.bar.style.width = `${fills[k] * 100}%`; s.lab.style.color = k === active ? '#f4f7ff' : k < active ? 'rgba(244,247,255,0.62)' : 'rgba(244,247,255,0.34)'; });
    sections.forEach(({ e, t: s0, d = 2.1 }) => {
      show(e, win(t, s0 - 0.12, s0 + d, 0.25, 0.45));
      const kin = outQuint(prog(t, s0 - 0.12, s0 + 0.5)), kout = inOut(prog(t, s0 + d - 0.45, s0 + d));
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
    const cardW = [[T.wIki - 0.2, T.wVitrin + 0.4], [T.pPanel - 0.4, T.pEnd + 0.3]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = { mAnat: win(t, T.wIki - 0.6, T.wVitrin + 0.7, 0.01, 0.01), mPanel: win(t, T.pPanel - 0.7, T.pEnd + 0.6, 0.01, 0.01) };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      $r('anT').classList.toggle('on', t > T.wMavi - 0.1); $r('anD').classList.toggle('on', t > T.wAcik - 0.1);
      $r('anT').classList.toggle('on-hl', pk(t, T.wMavi + 0.3, 0.4) > 0.4); $r('anD').classList.toggle('on-hl', pk(t, T.wAcik + 0.3, 0.4) > 0.4);
      rowIn($r('anV'), t, T.wVitrin - 0.1, 30);
      $r('cmsT').textContent = typed('Evden Eve Nakliyat · Karşıyaka | Websiteniz', t, T.pPanel, T.pPanel + 1.0);
      $r('cmsD').textContent = typed('Ücretsiz keşif, aynı gün taşıma, tek telefonla randevu.', t, T.pPanel + 0.6, T.pAyar + 0.6);
      rowIn($r('cmsP'), t, T.pAyar + 0.5, 30);
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
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.12 * pk(t, TITLE0 + 0.05, 0.18) + 0.12 * pk(t, T.aNeden - 0.1, 0.18));

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
