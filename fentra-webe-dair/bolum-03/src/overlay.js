// Episode 3 overlays: the phone's inbox, the "GERÇEKTE" card, term cards, chapter bar, labels pinned to the city,
// the seal, captions, title, glossary and end frame. Pure function of time.
import * as THREE from 'three';
import { cues, clamp, lerp, prog, smooth, inOut, outCubic, outBack, outQuint, win } from './anim.js';
import { T } from './timeline.js';

const P = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  warn: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/>',
  mailbox: '<path d="M3 20V11a5 5 0 0 1 10 0v9"/><path d="M8 6h9a4 4 0 0 1 4 4v10H3"/><path d="M15.5 10V3.5h3.5"/><path d="M5.5 14h5"/>',
  seal: '<circle cx="12" cy="9" r="6"/><path d="M9 14.5L7.5 21l4.5-2.5 4.5 2.5-1.5-6.5"/><path d="M9.5 9l1.8 1.8L14.5 7.5"/>',
  sign: '<path d="M12 3v18M5 6h12l2 2.5-2 2.5H5zM8 21h8"/>',
  building: '<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  spam: '<path d="M4 7h16l-1.5 13h-13z"/><path d="M9 7V4h6v3M10 11l4 5M14 11l-4 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const ic = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const show = (e, a) => { a = clamp(a); e.style.opacity = a; e.style.visibility = a < 0.002 ? 'hidden' : 'visible'; return a; };
const tf = (e, s) => { e.style.transform = s; };
const blink = (t) => (Math.floor(t * 2.2) % 2 === 0 ? 1 : 0.15);
const pk = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));

export function createOverlay(root, city) {
  const add = (h) => { const e = typeof h === 'string' ? el(h) : h; root.appendChild(e); return e; };
  const canvas = city.canvas;
  const dark = add('<div id="dark"></div>');
  const vig = add('<div id="vig"></div>');
  const shadeTop = add('<div id="shadeTop"></div>');
  const shadeBot = add('<div id="shadeBot"></div>');

  // ---------------------------------------------------------------- phone (hook): an offer from a personal address
  const phone = add(`<div id="phone"><div class="body"></div><div class="scr">
    <div class="island"></div><div class="status"><span>9:41</span><span>●●● ▮</span></div>
    <div class="layer" style="background:#f7f8fb"><div class="inbox">
      <div class="ih">Gelen Kutusu</div>
      <div class="irow new" id="iNew"><div class="av" style="background:#8a93a6">${ic('user')}</div><div class="ib">
        <div class="from"><span id="iFrom">a•••85<b id="iDom">@gmail.com</b></span><em>şimdi</em></div><div class="subj">Fiyat Teklifi</div><div class="prev">Merhaba, istediğiniz teklif ekte...</div></div></div>
      ${[['Fatura', 'Ekim ayı faturanız hazır'], ['Toplantı', 'Yarın 10:00 uygun mu?'], ['Kargo', 'Siparişiniz yola çıktı']].map(([s, p]) => `<div class="irow"><div class="av"></div><div class="ib"><div class="from"><span>••••••</span><em>dün</em></div><div class="subj">${s}</div><div class="prev">${p}</div></div></div>`).join('')}
    </div></div></div></div>`);
  const $p = (id) => phone.querySelector('#' + id);
  const notif = add(`<div id="notif">${ic('mail')}<div><b>Fiyat Teklifi</b><span>a•••85@gmail.com</span></div></div>`);
  const qBubble = add('<div id="qBubble">?</div>');
  const persTag = add(`<div id="persTag">${ic('warn')}<span>Kişisel adres</span></div>`);

  // ---------------------------------------------------------------- the GERÇEKTE card
  const real = add(`<div id="real">
    <div class="mode" id="mMail"><div class="maild">
      <div class="mh"><div class="fav">W</div><div><div class="mn">Websiteniz ${ic('check', 'ic vchk')}</div><div class="ma" id="mAddr">bilgi<b>@websiteniz.com</b></div></div></div>
      <div class="ms"><small>KONU</small>Fiyat teklifi</div></div>
      <div class="cmp" id="cmp1"><span class="mono">a•••85@gmail.com</span><em class="bad">${ic('x')}Kişisel</em></div>
      <div class="cmp" id="cmp2"><span class="mono">bilgi<b>@websiteniz.com</b></span><em class="good">${ic('check')}Kurumsal</em></div></div>
    <div class="mode" id="mSignup"><div class="form2"><div class="fh">Yeni e-posta hesabı</div>
      <div class="lbl">Ad</div><div class="fld sm" id="su1"></div><div class="lbl">Adres</div><div class="fld sm" id="su2"></div>
      <div class="paybtn" id="suBtn">Hesap oluştur</div></div>
      <div class="sbanner" id="suOk">${ic('check')}<span>Hesap hazır · 2 dakika</span></div>
      <div class="sbanner bad" id="suBad">${ic('warn')}<span>Dolandırıcılar da açabilir</span></div></div>
    <div class="mode" id="mOwner"><div class="owner"><div class="oh">${ic('lock')}<span>@websiteniz.com hesapları</span></div>
      <div class="ot">Yalnızca alan adının sahibi açabilir.</div>
      <div class="sig" id="sig"><span>Saygılarımızla,</span><b>Websiteniz</b><i class="mono">bilgi@websiteniz.com</i></div></div></div>
    <div class="mode" id="mDns"><div class="dns"><div class="dh"><span class="mono">websiteniz.com</span> · DNS kayıtları</div>
      <div class="dr dim"><b>A</b><span class="mono">203.0.113.24</span></div>
      <div class="dr dim"><b>MX</b><span class="mono">mail.websiteniz.com</span></div>
      ${[['SPF', 'Kimler gönderebilir'], ['DKIM', 'Dijital imza'], ['DMARC', 'Sahteyse ne yapılsın']].map(([k, v], i) => `<div class="dr new" id="dr${i}"><b>TXT</b><span><strong>${k}</strong> · ${v}</span><i>${ic('check')}</i></div>`).join('')}
    </div></div>
    <div class="mode" id="mSpam"><div class="inbox2"><div class="tabs"><span id="tbIn">Gelen</span><span id="tbSp">Spam <i id="spN">1</i></span></div>
      <div class="irow2" id="spRow"><div class="fav">W</div><div><b>Fiyat teklifi</b><span class="mono">bilgi@websiteniz.com</span></div><em>${ic('warn')}</em></div>
      <div class="sbanner bad" id="spWarn" style="top:300px">${ic('warn')}<span>Mühürsüz e-posta spam'e düştü</span></div></div></div>
    <div class="mode" id="mAcc"><div class="panel"><div class="ph">${ic('server')}<span>E-posta hesapları</span></div>
      ${[['bilgi', true], ['satis', false], ['muhasebe', false], ['destek', false]].map(([n, base], i) => `<div class="prow acc" id="ac${i}"><span class="mono">${n}<b>@websiteniz.com</b></span>${base ? '<em id="incl">Pakete dahil</em>' : `<i>${ic('plus')}</i>`}</div>`).join('')}
    </div></div>
    <div class="mode" id="mExp"><div class="cal">${ic('calendar')}<div><b class="mono">websiteniz.com</b><span>Alan adının süresi doldu</span></div></div>
      <div class="bounce" id="bounce">${ic('mail')}<div><b>E-posta teslim edilemedi</b><span class="mono">bilgi@websiteniz.com adresine ulaşılamıyor</span></div></div></div>
    <div class="tag"><i></i>GERÇEKTE</div>
  </div>`);
  const $r = (id) => real.querySelector('#' + id);
  const modes = Object.fromEntries(['mMail', 'mSignup', 'mOwner', 'mDns', 'mSpam', 'mAcc', 'mExp'].map((k) => [k, $r(k)]));

  // the seal: three rings that light on SPF, DKIM, DMARC, then stamp a letter
  const seal = add(`<div id="bigSeal"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="sbg"/>
    ${[0, 1, 2].map((k) => `<path id="sr${k}" class="sr" d="${arcPath(100, 100, 70, -90 + k * 120 + 8, -90 + (k + 1) * 120 - 8)}"/>`).join('')}
    <path d="M78 102l15 15 30-34" class="sck"/></svg><div class="sl">${['SPF', 'DKIM', 'DMARC'].map((k, i) => `<span id="sl${i}">${k}</span>`).join('')}</div></div>`);

  // ---------------------------------------------------------------- pins in the city
  const pin = (icon, text, cls = '') => add(`<div class="pin ${cls}"><div class="ic2">${ic(icon)}</div><span>${text}</span></div>`);
  const stem = () => add('<div class="stem"></div>');
  const mk = { adres: pin('sign', 'ADRES'), bina: pin('building', 'BİNA'), yol: pin('route', 'YOL'), kilit: pin('lock', 'KİLİT') };
  const mkStem = { adres: stem(), bina: stem(), yol: stem(), kilit: stem() };
  const ghostQ = add('<div class="chip" style="font-family:Manrope;font-weight:800">POSTA KUTUSU <span class="q">?</span></div>');
  const addrPin = add('<div class="chip" style="font-size:30px">bilgi<span style="color:#5b9cff">@websiteniz.com</span></div>');
  const fakePin = add(`<div class="chip warnchip">${ic('warn')}<span>SAHTE</span></div>`);
  const minePin = pin('check', 'SİZİN', 'blue');
  const fakeLetterPin = add(`<div class="chip warnchip">${ic('mail')}<span>Sahte e-posta</span></div>`);
  const deptPins = ['satis', 'muhasebe', 'destek'].map((n) => add(`<div class="chip" style="font-size:24px">${n}<span style="color:#5b9cff">@</span></div>`));

  // ---------------------------------------------------------------- chapter bar, sections, terms
  const series = add(`<div id="series">WEB<span>'</span>E DAİR <span style="margin-left:10px;font-family:'JetBrains Mono';font-weight:700;letter-spacing:.1em">· 03</span></div>`);
  const chap = add(`<div id="chap">${[['01', 'ADRES'], ['02', 'MÜHÜR'], ['03', 'KURULUM']].map(([n, l]) => `<div class="seg"><div class="lab"><b>${n}</b>${l}</div><div class="bar"><i></i></div></div>`).join('')}</div>`);
  const segs = [...chap.querySelectorAll('.seg')].map((s) => ({ lab: s.querySelector('.lab'), bar: s.querySelector('.bar i') }));
  const sect = (n, name, sub) => add(`<div class="sect"><div class="num">${n}</div><div class="name" style="font-size:104px">${name}</div><div class="sub"><i></i>${sub}</div></div>`);
  const sections = [
    { e: sect('01', 'ADRES', 'bilgi@websiteniz.com'), t: T.w0 },
    { e: sect('02', 'MÜHÜR', 'SPF · DKIM · DMARC'), t: T.s0 },
    { e: sect('03', 'KURULUM', 'Hesaplar'), t: T.u0 },
  ];
  sections[2].e.querySelector('.name').style.fontSize = '84px';   // KURULUM stays clear of the card
  const term = (k, s, d) => add(`<div class="term"><div class="k"><b>${k}</b><span>${s}</span></div><div class="d">${d}</div></div>`);
  const terms = [
    { e: term('KURUMSAL E-POSTA', '', 'Alan adınızla biten e-posta adresi.'), w: [[T.wAlan - 0.2, T.wMusteri - 0.2]] },
    { e: term('SPF · DKIM · DMARC', 'mühürler', 'DNS’e eklenen üç kayıt: e-postanın gerçekten sizden geldiğini kanıtlar.'), w: [[T.sSpf - 0.3, T.sMuhur + 0.6]] },
  ];
  terms[0].e.querySelector('.k b').style.fontSize = '50px';
  terms[1].e.querySelector('.k b').style.fontSize = '40px';

  // ---------------------------------------------------------------- title, glossary, next, end
  const titleTxt = "WEB'E DAİR";
  const title = add(`<div id="title"><div class="t">${[...titleTxt].map((c) => `<span class="${c === "'" ? 'ap' : ''}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
    <div class="ep">BÖLÜM 03</div><div class="rule"></div>
    <div class="sub2"><svg viewBox="0 0 24 24" id="tIcon">${P.mailbox}</svg><span>Kapınızdaki posta kutusu</span></div></div>`);
  const tChars = [...title.querySelectorAll('.t span')], tEp = title.querySelector('.ep'), tRule = title.querySelector('.rule'), tSub = title.querySelector('.sub2');
  const tParts = [...title.querySelectorAll('#tIcon path')];
  tParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const gloss = add(`<div id="gloss"><div class="hd"><div class="ttl"><b>WEB'E DAİR</b> · SÖZLÜK</div><div class="bm" id="bm">${ic('bookmark')}</div></div>
    ${[['mailbox', 'Kurumsal e-posta', 'Posta kutunuz'], ['seal', 'SPF · DKIM · DMARC', 'Mektuplarınızın mührü'], ['spam', 'Spam', 'Mühürsüz mektupların yeri']].map(([i, k, v]) => `<div class="row"><div class="ico">${ic(i)}</div><div class="k" style="width:auto;font-size:30px;white-space:nowrap">${k}</div><div class="eqs">=</div><div class="v" style="font-size:29px">${v}</div></div>`).join('')}
    <div class="foot">${ic('calendar')}<span>Alan adınızı yenilemeyi unutmayın: e-postanız da ona bağlı.</span></div></div>`);
  const gRows = [...gloss.querySelectorAll('.row')], gFoot = gloss.querySelector('.foot'), bm = gloss.querySelector('#bm'), bmPath = bm.querySelector('path');
  const saveLbl = add('<div id="saveLbl">KAYDET</div>');
  const next = add(`<div id="next"><div class="lb">SIRADAKİ BÖLÜM</div><svg viewBox="0 0 48 24" style="width:420px;height:210px">
    <path d="M40 22V4h6v18" id="q0"/>${[0, 1, 2, 3].map((k) => `<circle cx="${32 - k * 8}" cy="9" r="2.4" id="qh${k}"/><path d="M${32 - k * 8} 12v6M${29 - k * 8} 22l3-4 3 4" id="qb${k}"/>`).join('')}</svg>
    <div class="tt">Kapınızdaki kuyruk</div><div class="ss">SİTE HIZI</div></div>`);
  const qParts = [...next.querySelectorAll('svg path, svg circle')];
  qParts.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
  const endf = add(`<div id="endf"><div class="t">WEB<span class="ap">'</span>E DAİR</div><div class="s">Bölüm 3 · Kapınızdaki posta kutusu</div><div class="rule"></div>
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
    const nk = outQuint(prog(t, T.geldi - 0.6, T.geldi - 0.1));
    show(notif, win(t, T.geldi - 0.6, T.gonderen + 0.2, 0.2, 0.3)); tf(notif, `translate(540px, ${200 + (1 - nk) * -80}px) translate(-50%, 0)`);
    const rowK = outCubic(prog(t, T.geldi - 0.1, T.geldi + 0.35));
    $p('iNew').style.transform = `translateY(${(1 - rowK) * -60}px)`; $p('iNew').style.opacity = rowK;
    $p('iFrom').classList.toggle('on-hl', t > T.gonderen - 0.05 && t < T.hookEnd);
    $p('iDom').style.color = t > T.gmail - 0.05 ? '#d93025' : '';
    const pt = win(t, T.gmail + 0.1, T.hookEnd + 0.2, 0.2, 0.3);
    show(persTag, pt); tf(persTag, `translate(540px, 940px) translate(-50%, 0) scale(${lerp(0.6, 1, pop(t, T.gmail + 0.25))})`);
    const qa = win(t, T.guven - 0.1, T.hookEnd + 0.25, 0.2, 0.25);
    show(qBubble, qa); tf(qBubble, `translate(820px, 640px) translate(-50%, -50%) scale(${lerp(0.4, 1, pop(t, T.guven, 2.2))}) rotate(${Math.sin(t * 5) * 6}deg)`);

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
    tParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.tPosta - 0.4 + k * 0.12, T.tPosta + 0.3 + k * 0.12))); });

    // ---- bridge pins and the mailbox ghost
    const mA = win(t, T.bAdres - 0.2, T.bSira + 0.3, 0.25, 0.4);
    [['adres', city.anchors.sign, T.bAdres], ['bina', city.anchors.heroTop, T.bBina], ['yol', [-20, 1, 14], T.bYol], ['kilit', city.anchors.lock, T.bKilit]].forEach(([k, a, t0]) => {
      const kk = prog(t, t0 - 0.1, t0 + 0.3);
      place(mk[k], a, mA * kk, { lift: 100 * outBack(kk, 1.5), scale: lerp(0.6, 1, outBack(kk, 1.8)) * (1 + 0.15 * pk(t, t0 + 0.2, 0.25)) });
      placeStem(mkStem[k], a, mA * kk * 0.9, 90 * outCubic(kk));
    });
    place(ghostQ, city.anchors.mailbox, win(t, T.bPosta - 0.1, T.w0 + 0.3, 0.25, 0.3), { lift: 60 + Math.sin(t * 3) * 6, scale: lerp(0.7, 1, pop(t, T.bPosta)) });

    // ---- chapter bar, sections, terms
    const chapA = win(t, T.w0 - 0.3, T.r0 - 0.1, 0.5, 0.4);
    show(series, chapA); show(chap, chapA);
    const fills = [prog(t, T.w0, T.s0 - 0.2), prog(t, T.s0, T.u0 - 0.2), prog(t, T.u0, T.xEnd)];
    const active = t < T.s0 ? 0 : t < T.u0 ? 1 : 2;
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
    const cardW = [[T.wAlan - 0.2, T.tEnd + 0.3], [T.sRehber - 0.4, T.pEnd + 0.3], [T.u0 + 0.2, T.xEnd + 0.4]];
    let cardA = 0, cardIn = 1;
    for (const [a0, a1] of cardW) { const aa = win(t, a0, a1, 0.35, 0.35); if (aa > cardA) { cardA = aa; cardIn = outQuint(prog(t, a0, a0 + 0.5)); } }
    show(real, cardA);
    tf(real, `translate(${(1 - cardIn) * 40}px, ${(1 - cardIn) * -30}px) scale(${lerp(0.9, 1, cardIn)})`);
    const mw = {
      mMail: win(t, T.wAlan - 0.3, T.tKisisel, 0.01, 0.3),
      mSignup: win(t, T.tKisisel - 0.2, T.tAma, 0.3, 0.3),
      mOwner: win(t, T.tAma - 0.1, T.tEnd + 0.5, 0.3, 0.01),
      mDns: win(t, T.sRehber - 0.5, T.pYoksa + 0.1, 0.01, 0.3),
      mSpam: win(t, T.pYoksa - 0.1, T.pEnd + 0.5, 0.3, 0.01),
      mAcc: win(t, T.u0, T.x0 + 0.1, 0.01, 0.3),
      mExp: win(t, T.x0 - 0.15, T.xEnd + 0.6, 0.3, 0.01),
    };
    for (const k in modes) show(modes[k], mw[k]);
    if (cardA > 0) {
      $r('mAddr').classList.toggle('on-hl', t > T.wAdr - 0.1 && t < T.wMusteri);
      const c1 = outQuint(prog(t, T.wMusteri - 0.1, T.wMusteri + 0.35)), c2 = outQuint(prog(t, T.wGercek - 0.2, T.wGercek + 0.25));
      show($r('cmp1'), c1); tf($r('cmp1'), `translateX(${(1 - c1) * 40}px)`);
      show($r('cmp2'), c2); tf($r('cmp2'), `translateX(${(1 - c2) * 40}px)`);
      $r('cmp2').classList.toggle('on-hl', t > T.wGercek + 0.2);
      $r('su1').textContent = typed('Teklif Firma', t, T.tKisisel + 0.2, T.tHerkes + 0.3);
      $r('su2').textContent = typed('teklif.firma85@•••', t, T.tHerkes + 0.2, T.tHerkes + 0.9);
      $r('suBtn').style.background = t > T.tHerkes + 1.0 ? '#1f9d55' : '';
      const ok = outBack(prog(t, T.tHerkes + 1.0, T.tHerkes + 1.35), 1.8);
      show($r('suOk'), ok * 3); tf($r('suOk'), `scale(${lerp(0.7, 1, ok)})`);
      const bad = outBack(prog(t, T.tDolan - 0.05, T.tDolan + 0.3), 1.8);
      show($r('suBad'), bad * 3); tf($r('suBad'), `scale(${lerp(0.7, 1, bad)})`);
      $r('sig').classList.toggle('on-hl', t > T.tImza - 0.2);
      show($r('sig'), smooth(prog(t, T.tKurumsal - 0.2, T.tKurumsal + 0.3)));
      [T.sSpf, T.sDkim, T.sDmarc].forEach((w, i) => {
        const k = outQuint(prog(t, w - 0.1, w + 0.3)), e = $r('dr' + i);
        show(e, k); tf(e, `translateX(${(1 - k) * 40}px)`); e.classList.toggle('ok', t > w + 0.25);
      });
      const sp = t > T.pSpam - 0.1;
      $r('tbIn').classList.toggle('on', !sp); $r('tbSp').classList.toggle('on', sp);
      show($r('spRow'), sp ? outQuint(prog(t, T.pSpam - 0.1, T.pSpam + 0.3)) : 0); show($r('spN'), sp ? 1 : 0);
      show($r('spWarn'), smooth(prog(t, T.pDus - 0.1, T.pDus + 0.3)));
      show($r('incl'), smooth(prog(t, T.uHosting - 0.1, T.uHosting + 0.3)));
      [null, T.uSatis, T.uMuhasebe, T.uDestek].forEach((w, i) => {
        const e = $r('ac' + i);
        if (w === null) { show(e, 1); return; }
        const k = outQuint(prog(t, w - 0.1, w + 0.3)); show(e, k); tf(e, `translateX(${(1 - k) * 40}px)`); e.classList.toggle('on-hl', pk(t, w + 0.3, 0.35) > 0.4);
      });
      const bk = outQuint(prog(t, T.xDur - 0.4, T.xDur + 0.1));
      show($r('bounce'), bk); tf($r('bounce'), `translateY(${(1 - bk) * 30}px)`);
    }

    // ---- the seal
    const sA = win(t, T.sBunlar - 0.3, T.sMuhur + 0.7, 0.3, 0.35);
    show(seal, sA);
    const stampK = inOut(prog(t, T.sMuhur - 0.1, T.sMuhur + 0.5));
    tf(seal, `translate(${lerp(300, 420, stampK)}px, ${lerp(1000, 1080, stampK)}px) translate(-50%, -50%) scale(${lerp(0.7, 1, pop(t, T.sBunlar - 0.2, 1.5)) * lerp(1, 0.35, stampK)})`);
    [0, 1, 2].forEach((k) => {
      const on = t > T.sBunlar - 0.2 + k * 0.35;
      seal.querySelector('#sr' + k).classList.toggle('on', on); seal.querySelector('#sl' + k).classList.toggle('on', on);
    });

    // ---- pins
    place(addrPin, city.anchors.mailbox, win(t, T.wAdr - 0.15, T.wMusteri + 0.2, 0.25, 0.35), { lift: 70, scale: lerp(0.6, 1, pop(t, T.wAdr)) });
    place(fakePin, city.anchors.fake, win(t, T.tDolan - 0.1, T.tAma + 0.5, 0.2, 0.3), { lift: 40, scale: lerp(0.6, 1, pop(t, T.tDolan)) });
    place(minePin, city.anchors.mailbox, win(t, T.tSiz - 0.1, T.tEnd, 0.25, 0.35), { lift: 60, scale: lerp(0.6, 1, pop(t, T.tSiz)) });
    place(fakeLetterPin, city.anchors.fakeLetter, win(t, T.sSahte, T.sBunlar + 0.5, 0.3, 0.3), { lift: 50, scale: lerp(0.6, 1, pop(t, T.sSahte + 0.2)) });
    deptPins.forEach((e, k) => { const w = [T.uSatis, T.uMuhasebe, T.uDestek][k]; place(e, () => city.anchors.dept(k), win(t, w - 0.05, T.uEnd + 0.3, 0.2, 0.3), { lift: 40, scale: lerp(0.6, 1, pop(t, w + 0.1)) }); });

    // ---- glossary, save, next, end
    const gA = win(t, T.r0 - 0.45, T.next - 0.05, 0.4, 0.4);
    show(gloss, gA); tf(gloss, `translateY(${(1 - outQuint(prog(t, T.r0 - 0.45, T.r0 + 0.1))) * 60}px) translateX(${-inOut(prog(t, T.next - 0.45, T.next - 0.05)) * 120}px)`);
    [T.gPosta, T.gSpf, T.gSpf + 2.4].forEach((w, k) => {
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
    qParts.forEach((p, k) => { p.style.strokeDashoffset = +p.dataset.len * (1 - outCubic(prog(t, T.kuyruk - 0.6 + k * 0.08, T.kuyruk + 0.1 + k * 0.08))); });
    show(endf, smooth(prog(t, T.endCard - 0.15, T.endCard + 0.3)));
    const e1 = outQuint(prog(t, T.endCard - 0.15, T.endCard + 0.45));
    tf(eT, `translateY(${(1 - e1) * 40}px)`); eT.style.filter = e1 < 0.99 ? `blur(${(1 - e1) * 12}px)` : 'none';
    show(eS, smooth(prog(t, T.endCard + 0.25, T.endCard + 0.7)));
    eRule.style.width = `${380 * outCubic(prog(t, T.endCard + 0.3, T.fentra))}px`;
    const lg = outQuint(prog(t, T.fentra - 0.15, T.fentra + 0.5));
    show(eLogo, lg); tf(eLogo, `translateY(${(1 - lg) * 30}px) scale(${lerp(0.92, 1, lg)})`);
    show(eH, smooth(prog(t, T.fentra + 0.4, T.fentra + 0.9)));
    show(flash, 0.35 * pk(t, T.title - 0.05, 0.2) + 0.22 * pk(t, T.w0 + 0.45, 0.18));

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

function arcPath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
