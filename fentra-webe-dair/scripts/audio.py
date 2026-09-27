"""Music, sound design and mix for WEB'E DAİR · Bölüm 1 -> output/_audio.wav

Everything except the voice is synthesized here and locked to the same word-level cues as the animation
(output/cues.json): an energetic 112 bpm bed (C – Am – F – G) that ducks under the voice, UI sounds for
every on-screen action (typing, taps, cards, pins), whooshes on camera moves, the route's riser and
arrival chime, a rewind for the recap and the Fentra sonic logo (G – C – E) on the end frame.
The mix is normalized to -14 LUFS with a -1 dBTP ceiling.
"""
import json, subprocess
from pathlib import Path

import numpy as np
import imageio_ffmpeg
import pyloudnorm as pyln
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
C = json.loads((OUT / "cues.json").read_text())
SR = 48000
DUR = float(C["duration"])
N = int(round(SR * DUR))
t = np.arange(N) / SR
rng = np.random.default_rng(11)


# ------------------------------------------------------------------ cues (same lookups as src/timeline.js)
def norm(w): return w.replace("İ", "i").replace("I", "ı").lower().translate(str.maketrans("", "", ",.:;?!\"…"))
def word(scene, sent, text, nth=0):
    s = next(x for x in C["sentences"] if x["scene"] == scene and x["idx"] == sent)
    ids = [w for p in s["phrases"] for w in C["phrases"][p]["words"]]
    key = norm(text)
    hits = [i for i in ids if norm(C["words"][i]["w"]).startswith(key)]
    return C["words"][hits[nth]]
def at(*a): return word(*a)["start"]
def end(*a): return word(*a)["end"]
SC = C["scenes"]
T = dict(
    type0=at("hook", 0, "Google"), type1=end("hook", 0, "yazarsınız"), results=at("hook", 1, "Bir"),
    tap=at("hook", 1, "dokunursunuz") + 0.3, pageOpen=at("hook", 1, "açılır"), sec=at("hook", 2, "saniye"),
    dive0=at("hook", 3, "Ama"), perde=at("hook", 3, "perde"), three=at("hook", 3, "üç"),
    title=at("title", 0, "Web'e"), ep=at("title", 1, "Birinci"), tAdres=at("title", 1, "adres"), tBina=at("title", 1, "bina"),
    tYol=at("title", 1, "yol"), titleEnd=SC["title"]["end"],
    d1=at("domain", 0, "Birincisi"), dTerm=at("domain", 0, "domain"), dGoogle=at("domain", 1, "Google"), dBar=at("domain", 1, "adres"),
    dName=at("domain", 1, "websiteniz"), dShop=at("domain", 2, "Dükkanınızın"), dSite=at("domain", 2, "sitenizin"), dEnd=SC["domain"]["end"],
    h2=at("hosting", 0, "İkincisi"), hTerm=at("hosting", 0, "hosting"), hYazi=at("hosting", 1, "yazılar"), hFoto=at("hosting", 1, "fotoğraflar"),
    hMenu=at("hosting", 1, "menünüz"), hAll=at("hosting", 2, "Hepsi"), hGece=at("hosting", 2, "gece"), hGunduz=at("hosting", 2, "gündüz"),
    hPc=at("hosting", 2, "özel"), hSunucu=at("hosting", 3, "Bunlara"), hRent0=at("hosting", 4, "Hosting"), hRent=at("hosting", 4, "kiraladığınız"),
    hBina=at("hosting", 5, "Yani"), hBinaW=at("hosting", 5, "bina"),
    i0=at("ip", 0, "Peki"), iNames=at("ip", 2, "isimleri"), iDegil=at("ip", 2, "değil"), iNums=at("ip", 2, "numaraları"), iEvery=at("ip", 3, "Her"), iIP=at("ip", 3, "IP"),
    n3=at("dns", 0, "İşte"), nTerm=at("dns", 0, "DNS"), nBook=at("dns", 1, "Telefon"), nTap=at("dns", 2, "dokunursunuz"), nMemo=at("dns", 2, "numarayı"),
    nFind=at("dns", 2, "telefon"), nDns=at("dns", 3, "DNS"), nConv=at("dns", 3, "numaraya"), nGo=at("dns", 3, "sizi"), nArrive=end("dns", 3, "götürür"),
    m0=at("move", 0, "Hosting'inizi"), mSame=at("move", 0, "adresiniz"), mOnly=at("move", 1, "Sadece"), mNum=at("move", 1, "numara"),
    mUpd=at("move", 1, "güncellenir"), mWave=at("move", 2, "Bunun"), mEnd=SC["move"]["end"],
    r0=at("recap", 0, "Şimdi"), rType=at("recap", 1, "Adresi"), rDns=at("recap", 1, "DNS"), rHost=at("recap", 1, "hosting"), rOpen=at("recap", 1, "açar"),
    rEnd=SC["recap"]["end"], o0=at("outro", 0, "İşte"), gDomain=at("outro", 1, "Domain"), gHosting=at("outro", 1, "hosting"), gDns=at("outro", 1, "DNS"),
    save=at("outro", 2, "Bu"), next=at("outro", 3, "Sıradaki"), lock=at("outro", 3, "kapınızdaki"), endCard=at("outro", 4, "Web'e"),
    fentra=at("outro", 4, "Fentra'yla"),
)


# ------------------------------------------------------------------ dsp helpers
def sos(kind, f, order=2): return butter(order, f, kind, fs=SR, output="sos")
def lp(x, f, o=2): return sosfilt(sos("low", min(f, SR / 2 - 100), o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos("high", f, o), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(sos("band", [lo, min(hi, SR / 2 - 100)], o), x, axis=0)
def secs(d): return np.arange(int(d * SR)) / SR
def pan(m, p=0.0):
    a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1)
def place(buf, start, sig, gain=1.0):
    i = int(round(start * SR))
    if sig.ndim == 1: sig = pan(sig)
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i + n] += sig[:n] * gain
def env_exp(n, tau): return np.exp(-np.arange(n) / SR / tau)
def ir(seconds, damp=7000, seed=1, pre=0.015):
    r = np.random.default_rng(seed)
    n = int(seconds * SR); tt = np.arange(n) / SR
    out = np.stack([lp(r.standard_normal(n), damp) * np.exp(-tt * 6.9 / seconds) for _ in range(2)], axis=1)
    out[: int(pre * SR)] = 0
    return out / np.abs(out).max()
IR_ROOM, IR_HALL = ir(0.9, 6500, 3), ir(2.6, 5200, 5)
def verb(x, which=IR_HALL, mix=0.25):
    if x.ndim == 1: x = pan(x)
    wet = np.stack([fftconvolve(x[:, c], which[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - mix) + wet * mix * 0.35
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def S(*xs):
    """sum signals of different lengths"""
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[:len(x)] += x
    return out


# ------------------------------------------------------------------ instruments
def additive(f, dur, harm=20, tilt=1.0, decay=None, detune=0.0):
    tt = secs(dur); out = np.zeros(len(tt))
    for k in range(1, harm + 1):
        fk = f * k
        if fk > 16000: break
        amp = 1.0 / k ** tilt
        if decay is not None: amp = amp * np.exp(-tt / (decay / (1 + 0.35 * (k - 1))))
        out += amp * np.sin(2 * np.pi * fk * tt * (1 + detune) + k * 1.3)
    return out

def pluck(m, dur=0.6, bright=1.0):
    f = mtof(m); x = additive(f, dur, harm=14, tilt=1.1, decay=0.45 * bright)
    a = int(0.004 * SR); x[:a] *= np.linspace(0, 1, a)
    return x * env_exp(len(x), dur * 0.6)

def pad(ms, dur, cutoff=1800):
    tt = secs(dur); x = np.zeros((len(tt), 2))
    for m in ms:
        for c, d in enumerate((-0.004, 0.004)):
            x[:, c] += additive(mtof(m), dur, harm=16, tilt=1.0, detune=d) * 0.3
    x = lp(x, cutoff, 2)
    a = min(len(tt), int(0.6 * SR)); r = min(len(tt), int(0.8 * SR))
    e = np.ones(len(tt)); e[:a] = np.linspace(0, 1, a) ** 1.5; e[-r:] *= np.linspace(1, 0, r) ** 1.5
    return x * e[:, None]

def bass(m, dur):
    f = mtof(m); tt = secs(dur)
    x = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) + 0.12 * np.sin(2 * np.pi * 3 * f * tt)
    e = np.minimum(1, tt / 0.006) * np.exp(-tt / (dur * 0.9)); return x * e

def kick():
    tt = secs(0.42); f = 45 + 95 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt / 0.16) + 0.25 * bp(rng.standard_normal(len(tt)), 1500, 6000) * np.exp(-tt / 0.006)
    return x

def clap():
    tt = secs(0.35); n = rng.standard_normal(len(tt))
    e = np.zeros(len(tt))
    for o in (0, 0.011, 0.022): e += (tt >= o) * np.exp(-np.maximum(tt - o, 0) / 0.009)
    e += (tt >= 0.03) * np.exp(-np.maximum(tt - 0.03, 0) / 0.09) * 0.6
    return bp(n, 900, 5200) * e

def hat(open_=False):
    tt = secs(0.25 if open_ else 0.06); n = rng.standard_normal(len(tt))
    return hp(n, 7500, 2) * np.exp(-tt / (0.09 if open_ else 0.018))

def tick(f=5200, g=1.0):
    tt = secs(0.03); return bp(rng.standard_normal(len(tt)), f * 0.7, f * 1.3) * np.exp(-tt / 0.004) * g

def blip(f0=1400, f1=820, dur=0.09):
    tt = secs(dur); f = f1 + (f0 - f1) * np.exp(-tt / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (dur * 0.35)) * np.minimum(1, tt / 0.002)

def bell(m, dur=1.4, bright=1.0):
    f = mtof(m); tt = secs(dur); x = np.zeros(len(tt))
    for r, a, d in ((1, 1, 1.0), (2.0, 0.35 * bright, 0.5), (2.76, 0.22 * bright, 0.35), (5.4, 0.08 * bright, 0.18)):
        x += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / (dur * d * 0.45))
    return x * np.minimum(1, tt / 0.003)

def sweep_noise(dur, f0, f1, q=1.2, shape=2.0):
    """band-passed noise whose centre moves from f0 to f1 (a whoosh); per-block filtering"""
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        u = (i + blk / 2) / n; fc = f0 * (f1 / f0) ** u
        lo, hi = max(40, fc / (1 + q)), min(SR / 2 - 200, fc * (1 + q))
        seg = sosfilt(sos("band", [lo, hi], 2), x[max(0, i - 2048):i + blk])[-min(blk, n - i):]
        out[i:i + len(seg)] = seg
    tt = np.arange(n) / n
    return out * np.sin(np.pi * tt) ** shape

def whoosh(dur=0.9, up=True, g=1.0):
    x = sweep_noise(dur, 300, 5000) if up else sweep_noise(dur, 5000, 300)
    return x / (np.abs(x).max() + 1e-9) * g

def riser(dur):
    tt = secs(dur); u = tt / dur
    n = sweep_noise(dur, 400, 9000, shape=0.6) * u ** 2
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * u ** 2) / SR) * u ** 3 * 0.25
    x = n / (np.abs(n).max() + 1e-9) + tone
    return x * np.minimum(1, (dur - tt) / 0.03)

def impact(g=1.0):
    tt = secs(2.2); f = 38 + 70 * np.exp(-tt / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.5)
    crack = bp(rng.standard_normal(len(tt)), 200, 4000) * np.exp(-tt / 0.05)
    return (sub + 0.5 * crack) * g

def rewind(dur=1.0):
    tt = secs(dur); u = tt / dur
    f = 1400 * (1 - u) ** 1.5 + 90
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + 0.5 * sweep_noise(dur, 6000, 400, shape=0.8)
    return x * np.sin(np.pi * u) ** 0.7


# ------------------------------------------------------------------ voice
raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "quiet", "-i", str(ROOT / "assets/vo/bolum-01.mp3"), "-ac", "1", "-ar", str(SR),
                      "-f", "f32le", "-"], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.float32).astype(np.float64)
vo = hp(vo, 75, 2)
vo = np.concatenate([vo, np.zeros(max(0, N - len(vo)))])[:N]
meter = pyln.Meter(SR)
vo *= 10 ** ((-17.0 - meter.integrated_loudness(vo)) / 20)
VO = pan(vo) * 1.0
VO = VO * 0.93 + verb(vo, IR_ROOM, 0.12) * 0.07

# sidechain envelope from the voice
e = np.abs(vo); win = int(0.03 * SR)
e = np.convolve(e, np.ones(win) / win, mode="same")
e = e / (np.percentile(e[e > 1e-4], 95) + 1e-9)
att, rel = np.exp(-1 / (0.02 * SR)), np.exp(-1 / (0.35 * SR))
duck = np.zeros(N); acc = 0.0
step = 48
for i in range(0, N, step):
    v = min(1.0, e[i]); acc = v + (acc - v) * (att ** step if v > acc else rel ** step); duck[i:i + step] = acc
duck = 1 - 0.68 * np.clip(duck, 0, 1)             # about -10 dB under speech


# ------------------------------------------------------------------ music bed
MUS = np.zeros((N, 2))
BPM = 112; SPB = 60 / BPM; BAR = 4 * SPB
B0 = T["title"]                                    # the downbeat where the beat drops
def beat(b): return B0 + b * SPB
CH = [(48, [60, 64, 67, 74]), (45, [57, 60, 64, 67]), (41, [57, 60, 65, 69]), (43, [55, 59, 62, 67])]   # C(add9) Am7 Fmaj7 G

# hook: soft pad and a pulse, rising into the dive
place(MUS, 0.0, pad([60, 67, 74, 76], T["perde"] + 0.4, cutoff=1400) * 0.22)
for k in range(int(T["perde"] / (SPB / 2))):
    tt0 = k * SPB / 2 + 0.05
    place(MUS, tt0, pan(S(tick(9000, 0.18), hat() * 0.15), 0.3 if k % 2 else -0.3), 0.5 + 0.5 * (tt0 / T["perde"]))
place(MUS, T["dive0"], pad([48, 55, 62], T["perde"] - T["dive0"] + 0.3, cutoff=900) * 0.25)
place(MUS, T["perde"] - 1.5, riser(1.5), 0.32)
place(MUS, T["perde"] + 0.02, impact(0.55))
place(MUS, T["perde"], pad([36, 43, 52, 55, 60], T["title"] - T["perde"] + 0.6, cutoff=1200) * 0.3)
place(MUS, T["title"] - 0.9, riser(0.9), 0.25)
place(MUS, T["title"], impact(0.8))

# groove: title → outro
end_groove = T["endCard"]
nb = int((end_groove - B0) / SPB)
rewind_a, rewind_b = T["r0"] - 0.1, T["r0"] + 1.1   # the beat stops for the rewind
for b in range(nb):
    tb = beat(b)
    if rewind_a <= tb < rewind_b: continue
    bar, pos = divmod(b, 4)
    energy = 0.75 if tb < T["d1"] else 1.0
    place(MUS, tb, kick(), 0.55 * energy)
    if pos in (1, 3): place(MUS, tb, pan(clap(), 0.05), 0.2 * energy)
    place(MUS, tb + SPB / 2, pan(hat(), -0.25), 0.16)
    if pos == 3 and bar % 2 == 1: place(MUS, tb + SPB / 2, pan(hat(True), 0.25), 0.1)
    for s16 in range(4):
        place(MUS, tb + s16 * SPB / 4, pan(tick(10500, 0.5), 0.4 if s16 % 2 else -0.4), 0.06)
# chords, bass and arpeggio per 2 bars
nb2 = int((end_groove - B0) / (2 * BAR)) + 1
for k in range(nb2):
    t0 = B0 + k * 2 * BAR
    root, notes = CH[k % 4]
    if t0 >= end_groove: break
    dur = min(2 * BAR, end_groove - t0 + 0.8)
    cut = 1400 + 1600 * min(1, (t0 - B0) / 40)
    place(MUS, t0, pad(notes, dur + 0.4, cutoff=cut) * 0.2)
    for e8 in range(16):
        te = t0 + e8 * SPB / 2
        if te >= end_groove or rewind_a <= te < rewind_b: continue
        place(MUS, te, pan(bass(root - 12 + (12 if e8 % 8 == 6 else 0), SPB / 2 * 0.95), 0), 0.34)
    arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[3] + 12, notes[2] + 12, notes[1] + 12, notes[3], notes[2] + 12]
    for s in range(32):
        ts = t0 + s * SPB / 4
        if ts >= end_groove or rewind_a <= ts < rewind_b or ts < T["d1"] - 0.5: continue
        g = 0.09 if s % 2 == 0 else 0.06
        place(MUS, ts, pan(pluck(arp[s % 8], 0.35), -0.35 if s % 4 < 2 else 0.35), g)
# sidechain pump from the kick
pump = np.ones(N)
for b in range(nb):
    i = int(beat(b) * SR); L = int(0.22 * SR)
    if 0 <= i < N: pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.35 * np.exp(-np.arange(min(L, N - i)) / SR / 0.07))
MUS[:, 0] *= pump; MUS[:, 1] *= pump
# the rewind in the recap
place(MUS, rewind_a, rewind(1.1), 0.35)
# outro: the beat ends, a warm resolve and the sonic logo
place(MUS, T["endCard"] - 0.05, impact(0.35))
place(MUS, T["endCard"] - 0.1, pad([48, 55, 60, 64, 67, 71], DUR - T["endCard"] + 0.2, cutoff=2200) * 0.3)
for k, m in enumerate((67, 72, 76)):                       # G – C – E
    place(MUS, T["fentra"] - 0.05 + k * 0.2, pan(bell(m, 2.4), (-0.25, 0, 0.25)[k]), 0.34)
place(MUS, T["fentra"] + 0.65, pad([60, 64, 67, 72, 76], DUR - T["fentra"], cutoff=3000) * 0.25)
MUS = verb(MUS, IR_HALL, 0.18)
fade = np.ones(N); fl = int(1.2 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 2
MUS *= (duck * fade)[:, None]


# ------------------------------------------------------------------ sound design
FX = np.zeros((N, 2))
# typing on the phone
q = "websiteniz"
for k in range(len(q)):
    place(FX, T["type0"] + 0.05 + (k + 0.5) * (T["type1"] - T["type0"] - 0.13) / len(q), pan(S(tick(3800, 1), 0.4 * blip(2400, 1800, 0.03)), 0.1), 0.2)
place(FX, T["results"] - 0.12, whoosh(0.35, True), 0.12)
place(FX, T["tap"] - 0.02, S(blip(900, 500, 0.08), tick(2500)), 0.35)
place(FX, T["tap"] + 0.2, whoosh(0.45, True), 0.14)
place(FX, T["pageOpen"] - 0.05, bell(84, 0.8, 0.6), 0.1)
place(FX, T["sec"] - 0.3, blip(1800, 1500, 0.07), 0.2)
for k in range(8): place(FX, T["sec"] - 0.25 + k * 0.075, tick(6500), 0.08)
place(FX, T["perde"] - 0.25, whoosh(1.2, False), 0.3)
for k, tt0 in enumerate((T["three"] - 0.1, T["three"] + 0.12, T["three"] + 0.34)):
    place(FX, tt0 + 0.05, pan(blip(1300 + 200 * k, 900 + 150 * k, 0.1), (-0.3, 0, 0.3)[k]), 0.22)
for w in (T["tAdres"], T["tBina"], T["tYol"]): place(FX, w - 0.1, pluck(79, 0.5, 1.2), 0.18)
place(FX, T["ep"], whoosh(0.5, True), 0.1)
place(FX, T["titleEnd"] - 0.05, whoosh(1.3, False), 0.3)
# section intros
for s0 in (T["d1"], T["h2"], T["n3"]):
    place(FX, s0 - 0.25, whoosh(0.6, True), 0.22)
    place(FX, s0 + 0.05, impact(0.22))
# term cards and the real-life card
for tt0 in (T["dTerm"], T["hTerm"], T["hRent0"], T["iIP"], T["nTerm"]): place(FX, tt0 - 0.1, blip(1100, 1500, 0.08), 0.14)
for tt0 in (T["dGoogle"] - 0.2, T["hTerm"] + 0.15, T["nBook"] - 0.25, T["mOnly"] - 0.35):
    place(FX, tt0, whoosh(0.4, True), 0.12)
place(FX, T["dGoogle"] + 0.35, blip(1600, 2000, 0.07), 0.14)
for k in range(14): place(FX, T["dBar"] + 0.3 + k * (T["dName"] - 0.5 - T["dBar"]) / 14, tick(4200, 0.9), 0.14)
# the address flies into the sign, the sign powers on
place(FX, T["dName"] - 0.05, whoosh(0.6, True), 0.22)
place(FX, T["dName"] + 0.45, S(tick(1200) * 3, blip(300, 120, 0.2)), 0.3)
place(FX, T["dName"] + 0.8, bell(79, 1.6), 0.18)
place(FX, T["dName"] + 0.85, bell(84, 1.6), 0.1)
place(FX, T["dShop"] - 0.05, blip(1200, 900), 0.12); place(FX, T["dSite"] - 0.05, blip(1500, 1100), 0.12)
# website → files → servers
for k, w in enumerate((T["hYazi"], T["hFoto"], T["hMenu"])): place(FX, w, pan(blip(1000 + 180 * k, 1400 + 180 * k, 0.09), -0.3), 0.2)
for k in range(3): place(FX, T["hAll"] + 0.05 + k * 0.12, whoosh(0.7, False), 0.12)
for k in range(3):
    tt0 = T["hAll"] + 0.05 + k * 0.14
    place(FX, tt0, lp(sweep_noise(0.7, 80, 400, shape=0.5), 900) * 2.5, 0.25)
    place(FX, tt0 + 0.62, tick(900) * 4, 0.25)
place(FX, T["hGunduz"] - 0.3, pad([72, 76, 79, 84], 2.6, cutoff=5000), 0.12)
place(FX, T["hSunucu"] - 0.1, blip(900, 1300, 0.1), 0.2)
place(FX, T["hRent"] - 0.2, bell(72, 1.8, 0.7), 0.16); place(FX, T["hRent"] - 0.05, bell(79, 1.8, 0.7), 0.12)
for f in range(9): place(FX, T["hBina"] - 0.05 + f * 1.5 / 9, pluck(60 + [0, 2, 4, 7, 9, 12, 14, 16, 19][f], 0.4), 0.12)
place(FX, T["hBina"] - 0.1, whoosh(1.6, True), 0.14)
# IP: the name is rejected, numbers pop up
place(FX, T["i0"] - 0.2, whoosh(1.4, False), 0.22)
place(FX, T["iDegil"], blip(500, 300, 0.18), 0.22)
for k in range(14): place(FX, T["iNums"] - 0.1 + k * 0.06, pan(tick(3000 + 150 * k, 1), (k % 5 - 2) / 3), 0.14)
place(FX, T["iIP"] - 0.05, bell(84, 1.2), 0.14)
# DNS: phonebook, call, conversion, route, arrival
place(FX, T["nTap"] - 0.02, S(blip(900, 500, 0.08), tick(2500)), 0.3)
ring = np.sin(2 * np.pi * 450 * secs(0.9)) * np.minimum(1, secs(0.9) / 0.02) * np.minimum(1, (0.9 - secs(0.9)) / 0.05)
place(FX, T["nFind"] + 0.1, lp(ring, 2000), 0.07)
for k in range(12): place(FX, T["nConv"] - 0.1 + k * 0.045, tick(5000 + 300 * (k % 4)), 0.1)
place(FX, T["nConv"] + 0.45, blip(1500, 2200, 0.08), 0.15)
route_a, route_b = T["nConv"] + 0.35, T["nArrive"] - 0.1
place(FX, route_a, riser(route_b - route_a), 0.3)
place(FX, T["nArrive"] - 0.1, bell(76, 2.0), 0.2); place(FX, T["nArrive"] - 0.02, bell(83, 2.0), 0.12)
# moving house
place(FX, T["m0"] + 0.1, whoosh(1.5, True), 0.2)
for f in range(10): place(FX, T["m0"] + 0.1 + f * 1.6 / 11, pluck(55 + [0, 4, 7, 12, 16, 19, 24, 28, 31, 36][f], 0.35), 0.09)
place(FX, T["m0"] + 0.9, whoosh(1.7, False), 0.18)
for k in range(10): place(FX, T["mNum"] - 0.05 + k * 0.05, tick(5200), 0.1)
place(FX, T["mUpd"], bell(79, 1.2) + bell(84, 1.2) * 0.6, 0.14)
place(FX, T["mWave"], lp(sweep_noise(2.8, 150, 2500, shape=1.2), 3000), 0.4)
# recap
place(FX, T["r0"] - 0.35, whoosh(0.6, True), 0.14)
for k in range(14): place(FX, T["rType"] + k * 0.75 / 14, tick(3800), 0.16)
place(FX, T["rDns"] - 0.1, riser(1.0) * 0.8, 0.2)
place(FX, T["rOpen"] + 0.1, bell(84, 1.2), 0.16)
# outro
place(FX, T["gDomain"] - 0.5, whoosh(0.7, True), 0.18)
for w in (T["gDomain"], T["gHosting"], T["gDns"]): place(FX, w - 0.1, pluck(84, 0.45, 1.2), 0.14)
place(FX, T["save"] - 0.02, S(blip(1300, 2000, 0.07), tick(3000)), 0.28)
place(FX, T["save"] + 0.12, bell(91, 1.0, 0.5), 0.1)
place(FX, T["next"] - 0.3, whoosh(0.6, True), 0.18)
place(FX, T["lock"] + 0.35, tick(1800) * 2 + tick(900) * 2, 0.3)
FX = verb(FX, IR_ROOM, 0.2)


# ------------------------------------------------------------------ mix, loudness, limiter
mix = VO + MUS * 0.11 + FX * 0.42
mix = hp(mix, 25, 2)
lufs = meter.integrated_loudness(mix)
mix *= 10 ** ((-14.0 - lufs) / 20)

def limiter(x, ceiling_db=-1.2, look=0.004, release=0.08):
    c = 10 ** (ceiling_db / 20)
    over = 4                                          # true-peak estimate on a 4× oversampled signal
    up = resample_poly(x, over, 1, axis=0)
    peak = np.abs(up).max(axis=1).reshape(-1, over).max(axis=1)[: len(x)]
    need = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    L = int(look * SR)
    g = np.ones(len(x)); cur = 1.0; rel = np.exp(-1 / (release * SR))
    # look-ahead minimum, then smooth release
    from scipy.ndimage import minimum_filter1d
    need = minimum_filter1d(need, size=2 * L + 1, origin=0)
    for i in range(len(x)):
        target = need[i]
        cur = target if target < cur else target + (cur - target) * rel
        g[i] = cur
    return x * g[:, None]

mix = limiter(mix)
import os
if os.environ.get("STEMS"):
    g = 10 ** ((-14.0 - lufs) / 20)
    for name, x in (("vo", VO), ("music", MUS * 0.11), ("fx", FX * 0.42)):
        wavfile.write(OUT / f"_stem_{name}.wav", SR, (np.clip(x * g, -1, 1) * 32767).astype(np.int16))
print(f"integrated {meter.integrated_loudness(mix):.2f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.2f} dBFS, {DUR:.2f}s")
wavfile.write(OUT / "_audio.wav", SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print("wrote", OUT / "_audio.wav")
