// Episode 6 overlays (season finale): the phone with a map search, the "GERÇEKTE" card, term cards, chapter bar, labels
// pinned to the city, captions, title, the season card and end frame. Pure function of time.
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
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="16" cy="9" r="1.8"/><path d="M3 17l5-5 4 4 3-3 6 6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  nav: '<path d="M3 11l18-8-8 18-2-8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4-5"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M11 12.5L20 3.5M16.5 7l2.5 2.5M14 9.5l2 2"/>',
  queue: '<circle cx="5" cy="7" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="19" cy="7" r="2"/><path d="M2.5 19v-4a2.5 2.5 0 0 1 5 0v4M9.5 19v-4a2.5 2.5 0 0 1 5 0v4M16.5 19v-4a2.5 2.5 0 0 1 5 0v4"/>',
  reply: '<path d="M10 9V5l-7 7 7 7v-4c5 0 8.5 1.5 11 5-1-5-4-10-11-11z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };
const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
const stars = (n) => [1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'on' : ''}">${P.star ? ic('star') : ''}</i>`).join('');

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;
  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');

  // ---------------------------------------------------------------- phone (hook): a map search with three businesses, not yours
  const BIZ = [['Salon Nur', '4,8', '350 m'], ['Kuaför Efe', '4,6', '600 m'], ['Stil Salon', '4,3', '900 m']];
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer maps"><div class="mapbg">${[0, 1, 2].map((k) => `<div class="mpin" id="mp${k}">${ic('pin')}</div>`).join('')}<div class="me"></div></div>
      <div class="msearch">${ic('search')}<span id="mq"></span><i class="caret" id="mcar"></i></div>
      <div class="sheet">${BIZ.map(([n, r, d], k) => `<div class="biz" id="bz${k}"><div class="bt"><b>${n}</b><span class="rt" id="rt${k}">${r} <em>${stars(5)}</em></span><small>${d} · Açık</small></div><div class="bb" id="bb${k}">${ic('nav')}<span>Yol tarifi</span></div></div>`).join('')}
        <div class="biz none" id="bzNone"><div class="bt"><b>Websiteniz</b><small>Haritada yok</small></div><div class="qq">?</div></div></div>
    </div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const qBubble = add('<div id="qBubble">?</div>');

  // ---------------------------------------------------------------- the GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mProfile"><div class="gbp"><div class="ph6">${[0, 1, 2].map((k) => `<i id="ph${k}"></i>`).join('')}</div>
      <div class="gh"><b>Websiteniz</b><span id="gStars">4,8 <em>${stars(5)}</em> <small>(126 yorum)</small></span></div>
      ${[['pin', 'Örnek Cad. No 12, Konak'], ['clock', "Açık · 20:00'ye kadar"], ['phone', '0 (232) 000 00 00'], ['image', 'Fotoğraflar (24)'], ['star', '126 yorum']].map(([i, s], k) => `<div class="gr" id="gr${k}">${ic(i)}<span>${s}</span></div>`).join('')}
      <div class="gbtn">${[['nav', 'Yol tarifi'], ['phone', 'Ara'], ['globe', 'Web sitesi']].map(([i, s]) => `<span>${ic(i)}${s}</span>`).join('')}</div></div></div>
    <div class="mode" id="mSearch"><div class="pill" style="top:80px">${ic('search')}<span>yakınımdaki kuaför</span></div>
      ${[['Dükkan', '4,6', '120 m'], ...BIZ.slice(0, 2)].map(([n, r, d], k) => `<div class="srow6" id="sr${k}"><div class="sp">${ic('pin')}</div><div><b>${n}</b><span>${r} ${stars(5)} · ${d}</span></div><em>${ic('nav')}</em></div>`).join('')}
      <div class="sbanner bad" id="srNo" style="top:420px">${ic('x')}<span>Websiteniz haritada görünmüyor</span></div></div>
    <div class="mode" id="mVerify"><div class="form2"><div class="fh">İşletmenizi ekleyin</div>
      <div class="lbl">İşletme adı</div><div class="fld sm" id="vName"></div><div class="lbl">Doğrulama kodu</div>
      <div class="code">${[4, 8, 2, 1].map((d, k) => `<i id="cd${k}">${d}</i>`).join('')}</div></div>
      <div class="sbanner" id="vOk">${ic('check')}<span>İşletme doğrulandı</span></div></div>
    <div class="mode" id="mFill"><div class="panel"><div class="ph">${ic('pin')}<span>Profil</span><em class="goodt" id="pct">%40</em></div>
      <div class="prog5"><i id="fBar"></i></div>
      <div id="fList">${[['pin', 'Adres'], ['clock', 'Çalışma saatleri'], ['phone', 'Telefon'], ['globe', 'Web sitesi']].map(([i, s], k) => `<div class="prow fl" id="fl${k}">${ic(i)}<span>${s}</span><i>${ic('check')}</i></div>`).join('')}</div>
      <div id="cList">${['Site', 'Harita', 'Rehber'].map((s, k) => `<div class="prow fl ok" id="cl${k}"><b>${s}</b><span class="mono">Örnek Cad. No 12</span><i>${ic('check')}</i></div>`).join('')}</div></div></div>
    <div class="mode" id="mReviews"><div class="rvw">${[['Ayşe K.', 5, 'Çok memnun kaldık, ilgileri harika.', 'Teşekkür ederiz, yine bekleriz!'], ['Mert D.', 5, 'Hızlı ve özenli hizmet.', 'Çok sevindik, teşekkürler.'], ['Selin A.', 2, 'Randevum biraz gecikti.', 'Özür dileriz, düzelttik. Tekrar bekleriz.']].map(([n, s, x, r], k) => `<div class="rv ${s < 3 ? 'neg' : ''}" id="rv${k}"><div class="rh"><b>${n}</b><span class="rs">${stars(s)}</span></div><div class="rx">${x}</div><div class="rr" id="rr${k}">${ic('reply')}<span>${r}</span></div></div>`).join('')}</div></div>
    <div class="mode" id="mHours"><div class="panel"><div class="ph">${ic('clock')}<span>Çalışma saatleri</span></div>
      ${[['Pazartesi - Cuma', '09:00 - 20:00'], ['Cumartesi', '10:00 - 18:00'], ['Pazar', 'Kapalı']].map(([d, h]) => `<div class="prow hr"><span>${d}</span><b>${h}</b></div>`).join('')}
      <div class="prow hr sp" id="hSp"><span>${ic('calendar')} Bayram</span><b id="hSpB">Açık?</b></div></div>
      <div class="sbanner bad" id="hBad" style="top:430px">${ic('warn')}<span>Kartta "Açık" yazıyorsa müşteri kapıda kalır</span></div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mProfile', 'mSearch', 'mVerify', 'mFill', 'mReviews', 'mHours'].map((k) => [k, $r(k)]));

  // ---------------------------------------------------------------- pins in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const stem = () => add('<div class="stem"></div>');
  const warn = (icon, text) => add(`<div class="chip warnchip">${ic(icon)}<span>${text}</span></div>`);
  const chip = (icon, text, extra = '') => add(`<div class="chip" style="font-family:Manrope;font-weight:800;${extra}">${ic(icon)}<span>${text}</span></div>`);
  const GREEN = 'background:rgba(31,157,85,0.95)';
  const mk = { adres: pin('sign', 'ADRES'), bina: pin('building', 'BİNA'), yol: pin('route', 'YOL'), kilit: pin('lock', 'KİLİT'), posta: pin('mailbox', 'POSTA') };
  const mkStem = { adres: stem(), bina: stem(), yol: stem(), kilit: stem(), posta: stem() };
  const noQueue = chip('check', 'Kuyruk yok', GREEN);
  const whereQ = add('<div class="chip" style="font-family:Manrope;font-weight:800">Siz neredesiniz <span class="q">?</span></div>');
  const rivalTags = [0, 1, 2, 3, 4].map((k) => add(`<div class="chip rtag">${ic('star')}<span>${['4,6', '4,8', '4,4', '4,7', '4,3'][k]}</span></div>`));
  const bizChip = add(`<div class="chip bizchip">${ic('pin')}<span>Websiteniz <b>4,8</b></span></div>`);
  const noMap = warn('x', 'Haritada yok');
  const shopChip = add(`<div class="chip rtag big">${ic('pin')}<span>Dükkan <b>4,6</b></span></div>`);
  const verPin = pin('check', 'DOĞRULANDI', 'blue');
  const samePin = chip('check', 'Her yerde aynı adres', GREEN);
  const revChips = [5, 5, 2, 5, 5].map((n, k) => add(`<div class="chip rvchip ${n < 3 ? 'neg' : ''}" id="rc${k}"><span class="rs">${stars(n)}</span></div>`));
  const replyChip = chip('reply', 'Cevap verildi', GREEN);
  const stuck = warn('x', 'Kapıda kaldı');
  const pinSay = add(`<div class="chip bizchip" style="font-size:30px">${ic('pin')}<span>İşletme profili <b>=</b> haritadaki iğneniz</span></div>`);
  const SEASON = [['sign', 'ADRES'], ['building', 'BİNA'], ['route', 'YOL'], ['lock', 'KİLİT'], ['mailbox', 'POSTA'], ['gauge', 'HIZ'], ['key', 'YEDEK'], ['pin', 'HARİTA']];
  const sPins = SEASON.map(([i, s]) => pin(i, s, 'blue'));
  const done = add(`<div id="done"><div class="dt">SEZON 1</div><div class="db">${ic('check')}<span>TAMAM</span></div></div>`);

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· 06</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'KART'], ['02', 'KURULUM'], ['03', 'GÜVEN']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub, size = 104) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:${size}px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'KART', 'Haritadaki yeriniz'), t: T.k0 },
    { e: sect('02', 'KURULUM', 'Ücretsiz', 84), t: T.s0 },
    { e: sect('03', 'GÜVEN', 'Yorumlar · Saatler'), t: T.v0 },
  ];
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('İŞLETME PROFİLİ', '', 'İşletmenizin Google’daki ücretsiz kartı.'), w: [[T.kKart - 0.3, T.kAdres - 0.1]] },
    { e: term('YORUM', '', 'Müşterinin kartınıza bıraktığı puan ve görüş.'), w: [[T.vVitrin - 0.2, T.vIste]] },
  ];
  terms[0].e.querySelector('.k b').style.fontSize = '48px';

  // ---------------------------------------------------------------- title, season card, next season, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">BÖLÜM 06 · SEZON FİNALİ</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.pin}</svg><span>Haritadaki yeriniz</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path, #tIcon circle')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const GL = [['sign', 'Alan adı', 'Adres'], ['building', 'Hosting', 'Bina'], ['route', 'DNS', 'Yol tarifi'], ['lock', 'SSL', 'Kilit'], ['mailbox', 'Kurumsal e-posta', 'Posta kutusu'], ['gauge', 'Site hızı', 'Kuyruk'], ['key', 'Yedek', 'Yedek anahtar'], ['pin', 'İşletme profili', 'Haritadaki iğne']];
  const gloss = add(`<div id="gloss" class="season"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · SEZON 1 SÖZLÜĞÜ</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${GL.map(([i, k, v], n) => `<div class="row"><div class="ico">${ic(i)}</div><div class="nn">${n + 1}</div><div class="k">${k}</div><div class="eqs">=</div><div class="v">${v}</div></div>`).join('')}
    <div class="stamp6" id="stamp">SEZON 1 ✓</div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path'), stamp = gloss.querySelector('#stamp');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ SEZON</div><svg viewBox="0 0 48 24" style="width:420px;height:210px">
    <path d="M4 21h40"/><path d="M8 21v-5M15 21v-8M22 21v-11M29 21v-14"/><circle cx="38" cy="9" r="5"/><path d="M41.6 12.6l4 4"/><path d="M6 11l7-4 6 2 7-6"/></svg>
    <div class="tt">Google'da üst sıralar</div><div class="ss">SEZON 2 · SEO</div></div>`);
  const kParts = [...next.querySelectorAll('svg path, svg circle')];
  kParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Bölüm 6 · Haritadaki yeriniz · Sezon finali</div><div class="rule"></div>
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
  const typed = (txt, t, a, b) => txt.slice(0, Math.round(clamp((t - a) / (b - a)) * txt.length));
  const rowIn = (e, t, a, dx = 40) => { const k = outQuint(prog(t, a - 0.15, a + 0.3)); show(e, k); tf(e, `translateX(${(1 - k) * dx}px)`); return k; };

  // ================================================================ per frame
  function update(t) {
    show(dark, 1 - smooth(prog(t, T.hookEnd - 0.1, T.title + 0.3)));
    const blurTitle = 6 * win(t, T.hookEnd, T.titleEnd + 0.25, 0.4, 0.45);
    const gl = smooth(prog(t, T.save - 0.5, T.save + 0.3));
    const bl = blurTitle + 9 * gl * (1 - 0.35 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6)));
    const br = 1 - 0.35 * gl - 0.2 * smooth(prog(t, T.endCard - 0.3, T.endCard + 0.6));
    canvas.style.filter = bl > 0.05 || br < 0.999 ? `blur(${bl.toFixed(2)}px) brightness(${br.toFixed(3)})` : 'none';
    show(vig, 0.6 + 0.4 * win(t, T.title - 0.2, T.titleEnd + 0.3) + 0.4 * gl);
    show(shadeTop, t > T.hookEnd ? 1 : 0);
    show(shadeBot, 0.85 + 0.15 * gl);

    // ---- hook: a search on the map
    const hookA = smooth(prog(t, -0.2, 0.3)) * (1 - smooth(prog(t, T.hookEnd - 0.05, T.title + 0.1)));
    show(phone, hookA);
    tf(phone, `translateY(${(1 - outCubic(prog(t, -0.2, 0.5))) * 40}px) scale(${lerp(0.97, 1, outCubic(prog(t, 0, 0.6))) * lerp(1, 0.86, inOut(prog(t, T.hookEnd - 0.1, T.title + 0.2)))})`);
    $p('mq').textContent = typed('yakınımdaki kuaför', t, T.yakin - 0.5, T.yazdi + 0.2);
    show($p('mcar'), t < T.uc && Math.floor(t * 2.4) % 2 === 0 ? 1 : 0);
    [0, 1, 2].forEach((k) => {
      const d = outBack(prog(t, T.uc - 0.2 + k * 0.15, T.uc + 0.25 + k * 0.15), 2);
      const m = $p('mp' + k); show(m, clamp(d * 3)); tf(m, `translate(-50%, ${-100 - (1 - clamp(d)) * 60}%)`);
      const b = $p('bz' + k); rowIn(b, t, T.uc + 0.1 + k * 0.15, 0);
      $p('rt' + k).classList.toggle('on-hl', pk(t, T.yildiz + 0.3 + k * 0.1, 0.4) > 0.4);
      $p('bb' + k).classList.toggle('lit', pk(t, T.tarif + 0.3 + k * 0.1, 0.4) > 0.4);
    });
    const none = outBack(prog(t, T.sizin - 0.1, T.sizin + 0.35), 1.6); show($p('bzNone'), clamp(none * 3)); tf($p('bzNone'), `scale(${lerp(0.8, 1, clamp(none))})`);
    const qa = win(t, T.sizin + 0.6, T.hookEnd + 0.25, 0.2, 0.25);
    show(qBubble, qa); tf(qBubble, `translate(820px, 640px) translate(-50%, -50%) scale(${lerp(0.4, 1, pop(t, T.sizin + 0.7, 2.2))}) rotate(${Math.sin(t * 5) * 6}deg)`);

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
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tHarita - 0.5 + k * 0.12, T.tHarita + 0.2 + k * 0.12))); });

    // ---- bridge pins; then the map, where you're missing
    const mA = win(t, T.bAdres - 0.2, T.bAma + 0.1, 0.25, 0.4);
    [['adres', city.anchors.sign, T.bAdres], ['bina', city.anchors.heroTop, T.bBina], ['yol', city.anchors.route, T.bYol], ['kilit', city.anchors.lock, T.bKilit], ['posta', city.anchors.mailbox, T.bPosta]].forEach(([k, a, t0]) => {
      const kk = prog(t, t0 - 0.1, t0 + 0.3);
      place(mk[k], a, mA * kk, { lift: 100 * outBack(kk, 1.5), scale: lerp(0.6, 1, outBack(kk, 1.8)) * (1 + 0.15 * pk(t, t0 + 0.2, 0.25)) });
      placeStem(mkStem[k], a, mA * kk * 0.9, 90 * outCubic(kk));
    });
    place(noQueue, city.anchors.door, win(t, T.bKuyruk - 0.1, T.bAma, 0.25, 0.3), { lift: 30, scale: lerp(0.6, 1, pop(t, T.bKuyruk)) });
    const mapA = win(t, T.bHarita + 0.1, T.k0 + 0.2, 0.3, 0.3);
    place(whereQ, city.anchors.heroTop, mapA, { lift: 20, scale: lerp(0.6, 1, pop(t, T.bHarita + 0.3)) });
    rivalTags.forEach((e, k) => place(e, () => city.anchors.rival(k + 1), mapA * smooth(prog(t, T.bAma + 0.5 + k * 0.12, T.bAma + 0.9 + k * 0.12)), { lift: 6, scale: 0.85 }));

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.k0 - 0.3, T.r0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.k0, T.s0 - 0.2), prog(t, T.s0, T.v0 - 0.2), prog(t, T.v0, T.hEnd)];
    const active = t < T.s0 ? 0 : t < T.v0 ? 1 : 2;
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
    const cardW = [[T.kArama - 0.3, T.kEnd + 0.3], [T.w0 + 0.3, T.wKarti + 0.5], [T.sEkler - 0.3, T.sEnd + 0.3], [T.vMemnun - 0.3, T.vEnd + 0.3], [T.h0 - 0.1, T.hEnd + 0.3]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mProfile: win(t, T.kArama - 0.6, T.kEnd + 0.6, 0.01, 0.01), mSearch: win(t, T.w0, T.wKarti + 0.8, 0.01, 0.01),
      mVerify: win(t, T.sEkler - 0.6, T.sSonra, 0.01, 0.3), mFill: win(t, T.sSonra - 0.2, T.sEnd + 0.6, 0.3, 0.01),
      mReviews: win(t, T.vMemnun - 0.6, T.vEnd + 0.6, 0.01, 0.01), mHours: win(t, T.h0 - 0.4, T.hEnd + 0.6, 0.01, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      [T.kAdres, T.kSaat, T.kTel, T.kFoto, T.kYorum].forEach((w, k) => { const e = $r('gr' + k); rowIn(e, t, w); e.classList.toggle('on-hl', pk(t, w + 0.3, 0.35) > 0.4); });
      [0, 1, 2].forEach((k) => show($r('ph' + k), smooth(prog(t, T.kFoto - 0.1 + k * 0.1, T.kFoto + 0.25 + k * 0.1))));
      $r('gStars').classList.toggle('on-hl', pk(t, T.kYorum + 0.3, 0.35) > 0.4);
      [0, 1, 2].forEach((k) => rowIn($r('sr' + k), t, T.w0 + 0.4 + k * 0.15));
      $r('sr0').classList.toggle('on-hl', t > T.wKarar - 0.1);
      const no = outBack(prog(t, T.wKarti - 0.05, T.wKarti + 0.3), 1.8); show($r('srNo'), no * 3); tf($r('srNo'), `scale(${lerp(0.7, 1, no)})`);
      $r('vName').textContent = typed('Websiteniz', t, T.sEkler - 0.2, T.sEkler + 0.6);
      [0, 1, 2, 3].forEach((k) => $r('cd' + k).classList.toggle('on', t > T.sDogru - 0.6 + k * 0.12));
      const ok = outBack(prog(t, T.sDogru + 0.1, T.sDogru + 0.45), 1.8); show($r('vOk'), ok * 3); tf($r('vOk'), `scale(${lerp(0.7, 1, ok)})`);
      const fill = [T.sAdres, T.sSaat, T.sTel, T.sSite].filter((w) => t > w - 0.05).length;
      const fk = 40 + 15 * fill;
      $r('pct').textContent = `%${fk}`; $r('fBar').style.width = `${fk}%`;
      [T.sAdres, T.sSaat, T.sTel, T.sSite].forEach((w, k) => { const e = $r('fl' + k); e.classList.toggle('ok', t > w - 0.05); e.classList.toggle('on-hl', pk(t, w + 0.25, 0.3) > 0.4); });
      const cons = smooth(prog(t, T.sBu - 0.2, T.sBu + 0.3));
      show($r('fList'), 1 - cons); show($r('cList'), cons);
      [0, 1, 2].forEach((k) => rowIn($r('cl' + k), t, T.sBu + 0.1 + k * 0.25));
      [0, 1, 2].forEach((k) => { rowIn($r('rv' + k), t, T.vMemnun - 0.3 + k * 0.2, 30); const r = $r('rr' + k), w = k === 2 ? T.vOlumsuz + 0.1 : T.vCevap + k * 0.25; show(r, smooth(prog(t, w, w + 0.35))); });
      $r('rv2').classList.toggle('calm', t > T.vOlumsuz + 0.4);
      const sp = t > T.hGunc - 0.05;
      $r('hSpB').textContent = sp ? 'Kapalı' : 'Açık?'; $r('hSp').classList.toggle('ok', sp); $r('hSp').classList.toggle('on-hl', pk(t, T.h0 + 0.4, 0.5) > 0.4 || pk(t, T.hGunc + 0.3, 0.4) > 0.4);
      const hb = outBack(prog(t, T.hKapi - 0.1, T.hKapi + 0.3), 1.8); show($r('hBad'), hb * 3); tf($r('hBad'), `scale(${lerp(0.7, 1, hb)})`);
    }

    // ---- pins
    place(bizChip, city.anchors.heroPin, win(t, T.k0 + 0.6, T.kEnd + 0.2, 0.3, 0.3), { lift: 10, scale: lerp(0.6, 1, pop(t, T.k0 + 0.7)) });
    place(noMap, city.anchors.heroTop, win(t, T.wGorunmez + 0.1, T.wMusteri + 0.3, 0.25, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.wGorunmez + 0.2)) });
    place(shopChip, city.anchors.shopPin, win(t, T.wMusteri - 0.2, T.wEnd + 0.6, 0.25, 0.3), { lift: 6, scale: lerp(0.6, 1, pop(t, T.wDukkan)) * (1 + 0.12 * pk(t, T.wDukkan + 0.3, 0.3)) });
    place(verPin, city.anchors.heroPin, win(t, T.sDogru + 0.2, T.sSonra + 1.2, 0.25, 0.3), { lift: 10, scale: lerp(0.6, 1, pop(t, T.sDogru + 0.3)) });
    place(samePin, city.anchors.heroPin, win(t, T.sAyni - 0.2, T.sEnd + 0.3, 0.25, 0.3), { lift: 10, scale: lerp(0.6, 1, pop(t, T.sAyni)) });
    revChips.forEach((e, k) => {
      const t0 = T.v0 + 0.9 + k * 0.55;
      place(e, () => city.anchors.reviewer(k), win(t, t0, T.vEnd + 0.4, 0.25, 0.3) * (k === 2 ? 1 - smooth(prog(t, T.vOlumsuz + 0.4, T.vOlumsuz + 0.7)) : 1), { lift: 14 + (k % 2) * 48, scale: lerp(0.6, 1, pop(t, t0 + 0.1)) });
    });
    place(replyChip, () => city.anchors.reviewer(2), win(t, T.vOlumsuz + 0.5, T.vEnd + 0.4, 0.25, 0.3), { lift: 14, scale: lerp(0.6, 1, pop(t, T.vOlumsuz + 0.6)) });
    place(stuck, city.anchors.visitor, win(t, T.hKapi + 0.3, T.hEnd + 0.6, 0.25, 0.3), { lift: 20, scale: lerp(0.6, 1, pop(t, T.hKapi + 0.4)) });
    place(pinSay, city.anchors.heroPin, win(t, T.gIgne - 0.6, T.gSezon + 0.2, 0.3, 0.35), { lift: 10, scale: lerp(0.6, 1, pop(t, T.gIgne - 0.5)) });
    const sAnch = [city.anchors.sign, city.anchors.heroTop, city.anchors.route, city.anchors.lock, city.anchors.mailbox, city.anchors.gauge, city.anchors.safe, city.anchors.heroPin];
    sPins.forEach((e, k) => { const t0 = T.gSezon - 0.1 + k * ((T.gTamam - T.gSezon) / 8); place(e, sAnch[k], win(t, t0, T.save - 0.2, 0.2, 0.35), { lift: 20 + (k % 2) * 46, scale: 0.8 * lerp(0.6, 1, pop(t, t0 + 0.1)) }); });
    const dn = outBack(prog(t, T.gTamam - 0.05, T.gTamam + 0.4), 1.7);
    show(done, win(t, T.gTamam - 0.1, T.save - 0.1, 0.15, 0.35)); tf(done, `translate(-50%, -50%) scale(${lerp(0.5, 1, clamp(dn))}) rotate(${-6 + 6 * clamp(dn)}deg)`);

    // ---- the season card, save, next season, end
    const gA = win(t, T.save - 0.45, T.next - 0.05, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, T.save - 0.45, T.save + 0.1))) * 60}px) translateX(${-inOut(prog(t, T.next - 0.45, T.next - 0.05)) * 120}px)`);
    gRows.forEach((r, k) => { const kk = outQuint(prog(t, T.save - 0.35 + k * 0.07, T.save + 0.05 + k * 0.07)); show(r, kk); tf(r, `translateX(${(1 - kk) * 50}px)`); r.style.borderColor = `rgba(91,156,255,${k === 7 ? 0.7 : 0.12})`; });
    const stK = outBack(prog(t, T.saveW + 0.35, T.saveW + 0.7), 1.8); show(stamp, clamp(stK * 3)); tf(stamp, `rotate(-12deg) scale(${lerp(1.6, 1, clamp(stK))})`);
    const sv = prog(t, T.saveW - 0.05, T.saveW + 0.3);
    bmPath.style.fill = sv > 0.3 ? '#1c73fd' : 'transparent'; bmPath.style.stroke = sv > 0.3 ? '#1c73fd' : 'currentColor';
    tf(bm, `scale(${1 + 0.35 * Math.sin(clamp(sv) * Math.PI)})`);
    bm.style.borderColor = sv > 0.3 ? '#1c73fd' : 'rgba(255,255,255,0.25)';
    bm.style.boxShadow = sv > 0.3 ? '0 0 40px rgba(28,115,253,0.6)' : 'none';
    show(saveLbl, win(t, T.saveW, T.next - 0.1, 0.25, 0.3)); tf(saveLbl, `translate(968px, ${318 - 30 * outBack(prog(t, T.saveW, T.saveW + 0.35), 2)}px) translate(-100%, -100%)`);   // above the season card's bookmark
    show(next, win(t, T.next - 0.2, T.endCard - 0.05, 0.35, 0.35)); tf(next, `translateX(${(1 - outQuint(prog(t, T.next - 0.2, T.next + 0.3))) * 100}px)`);
    kParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.next + 0.6 + k * 0.12, T.next + 1.3 + k * 0.12))); });
    show(endf, smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3)));
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.18 * pk(t, T.k0 + 0.45, 0.18) + 0.22 * pk(t, T.gTamam + 0.1, 0.2));

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
