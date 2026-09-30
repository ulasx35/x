"""Music, sound design and mix for WEB'E DAİR · Bölüm 2 -> bolum-02/output/_audio.wav

Same approach as episode 1: everything except the voice is synthesized and locked to the word-level cues
(bolum-02/output/cues.json). A 112 bpm bed (Am – F – C – G) that ducks under the voice and drops out while
the site has no lock, UI sounds for the payment page, paper for the postcards, locks clicking shut on the
boxes, keys, the stamp, the padlock, the visitors turning back, the hosting panel's switches, and the Fentra
sonic logo (G – C – E) on the end frame. Normalized to -14 LUFS with a -1.2 dBTP ceiling.
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
    bar=at("hook", 1, "Adres"), red=at("hook", 1, "kırmızı"), warn=at("hook", 1, "Güvenli"), kart=at("hook", 2, "kart"),
    girer=at("hook", 2, "girer"), hookEnd=SC["hook"]["end"],
    title=at("title", 0, "Web'e"), ep=at("title", 1, "İkinci"), tKilit=at("title", 1, "kilit"), titleEnd=SC["title"]["end"],
    b0=at("bridge", 0, "Geçen"), bAdres=at("bridge", 0, "adresini"), bBina=at("bridge", 0, "binasını"), bYol=at("bridge", 0, "yolunu"),
    bBugun=at("bridge", 1, "Bugün"), bKilit=at("bridge", 1, "kilit"),
    h0=at("http", 0, "Bir"), hTel=at("http", 0, "telefonunuzla"), hHttp=at("http", 1, "HTTP"), hKart=at("http", 1, "kartpostal"),
    hKafe=at("http", 2, "kafedeki"), hWifi=at("http", 2, "Wi-Fi'da"), hSifre=at("http", 2, "şifreyi"), hOku=at("http", 2, "başkası"),
    s0=at("https", 0, "HTTPS"), sKutu=at("https", 0, "kilitli"), sKoyar=at("https", 0, "koyar"), sS=at("https", 1, "S", 1),
    sAnahtar=at("https", 2, "anahtarı"), sTarayici=at("https", 2, "tarayıcınızda"), sSunucu=at("https", 2, "sunucusunda"),
    sYolda=at("https", 3, "Yolda"), sGecir=at("https", 3, "geçirse"), sAnlamsiz=at("https", 3, "anlamsız"), sEnd=SC["https"]["end"],
    c0=at("cert", 0, "Peki"), cIste=at("cert", 1, "İşte"), cSSL=at("cert", 1, "SSL"), cKimlik=at("cert", 2, "kimlik"), cKurum=at("cert", 2, "kurum"),
    cKontrol=at("cert", 3, "kontrol"), cGecerli=at("cert", 3, "Geçerli"), cAdres=at("cert", 3, "adrese"), cSure=at("cert", 3, "süresi"),
    cHer=at("cert", 4, "Her"), cKapi=at("cert", 4, "kapıya"), cKilit=at("cert", 4, "kilit"),
    w0=at("without", 0, "Sertifika"), wWarn=at("without", 0, "Güvenli"), wCogu=at("without", 1, "Çoğu"), wGoogle=at("without", 2, "Google"),
    wEnd=SC["without"]["end"],
    p0=at("tip", 0, "İyi"), pHosting=at("tip", 0, "hosting"), pUcretsiz=at("tip", 0, "ücretsiz"), pYeniler=at("tip", 0, "kendiliğinden"),
    pAdres=at("tip", 1, "Adres"), pWarn=at("tip", 1, "Güvenli"), pKilitli=at("tip", 1, "kilitli"),
    r0=at("recap", 0, "Kısacası"), gHttp=at("recap", 0, "HTTP"), gHttps=at("recap", 0, "HTTPS"), gSsl=at("recap", 1, "SSL"),
    save=at("outro", 0, "Bu"), saveW=at("outro", 0, "kaydedin"), next=at("outro", 1, "Sıradaki"), posta=at("outro", 1, "posta"),
    endCard=at("outro", 2, "Web'e"), fentra=at("outro", 2, "Fentra'yla"),
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
raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "quiet", "-i", str(ROOT.parent / "assets/vo/bolum-02.mp3"), "-ac", "1", "-ar", str(SR),
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
CH = [(45, [57, 60, 64, 71]), (41, [57, 60, 65, 69]), (48, [60, 64, 67, 74]), (43, [55, 59, 62, 67])]   # Am(add9) Fmaj7 C(add9) G

# hook: a tense, quiet pulse under the warning, rising into the title
place(MUS, 0.0, pad([57, 64, 71, 72], T["title"] + 0.2, cutoff=1300) * 0.22)
for k in range(int(T["title"] / (SPB / 2))):
    tt0 = k * SPB / 2 + 0.05
    place(MUS, tt0, pan(S(tick(9000, 0.18), hat() * 0.15), 0.3 if k % 2 else -0.3), 0.45 + 0.55 * (tt0 / T["title"]))
place(MUS, T["warn"] - 0.05, pad([45, 52, 58], 2.2, cutoff=700) * 0.3)
place(MUS, T["title"] - 1.2, riser(1.2), 0.3)
place(MUS, T["title"], impact(0.8))

# groove: title → outro
end_groove = T["endCard"]
nb = int((end_groove - B0) / SPB)
rewind_a, rewind_b = T["w0"] - 0.05, T["wCogu"] + 0.9   # the beat drops out while the site has no lock
for b in range(nb):
    tb = beat(b)
    if rewind_a <= tb < rewind_b: continue
    bar, pos = divmod(b, 4)
    energy = 0.75 if tb < T["h0"] else 1.0
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
        if ts >= end_groove or rewind_a <= ts < rewind_b or ts < T["b0"] - 0.5: continue
        g = 0.09 if s % 2 == 0 else 0.06
        place(MUS, ts, pan(pluck(arp[s % 8], 0.35), -0.35 if s % 4 < 2 else 0.35), g)
# sidechain pump from the kick
pump = np.ones(N)
for b in range(nb):
    i = int(beat(b) * SR); L = int(0.22 * SR)
    if 0 <= i < N: pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.35 * np.exp(-np.arange(min(L, N - i)) / SR / 0.07))
MUS[:, 0] *= pump; MUS[:, 1] *= pump
# no lock: a cold, low drone while the beat is out, then a riser back in
place(MUS, rewind_a, pad([33, 40, 46, 51], rewind_b - rewind_a + 0.6, cutoff=600) * 0.4)
place(MUS, rewind_b - 1.0, riser(1.0), 0.22)
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
def err_tone():                                    # a soft two-tone "not okay"
    return S(blip(700, 640, 0.14), np.concatenate([np.zeros(int(0.13 * SR)), blip(520, 470, 0.2)]))
def lock_click(g=1.0):
    return S(tick(2600) * 2.2, np.concatenate([np.zeros(int(0.045 * SR)), tick(1500) * 2.6]), lp(blip(220, 90, 0.18), 800) * 0.8) * g
def paper():
    x = hp(sweep_noise(0.22, 2500, 7000, shape=1.5), 1500)
    return x / (np.abs(x).max() + 1e-9)
def keyjingle():
    return S(bell(96, 0.5, 0.4), np.concatenate([np.zeros(int(0.06 * SR)), bell(100, 0.5, 0.4) * 0.7]), tick(7000))
def glitch(dur=0.8):
    out = np.zeros(int(dur * SR))
    for k in range(int(dur / 0.035)):
        f = 900 + 3800 * rng.random(); seg = blip(f, f * 0.8, 0.03) * (0.4 + 0.6 * rng.random())
        i = int(k * 0.035 * SR); out[i:i + len(seg)] += seg[: len(out) - i]
    return out

# hook: the payment page
place(FX, T["bar"] - 0.05, blip(1500, 1900, 0.07), 0.12)
place(FX, T["red"] - 0.02, err_tone(), 0.22)
place(FX, T["warn"] - 0.08, whoosh(0.35, True), 0.12)
place(FX, T["warn"] - 0.02, err_tone(), 0.3)
place(FX, T["kart"] - 0.08, S(blip(900, 500, 0.08), tick(2500)), 0.3)
for k in range(7): place(FX, T["kart"] + 0.25 + (k + 0.5) * (T["girer"] - 0.45 - T["kart"]) / 7, tick(3800), 0.18)
place(FX, T["girer"] + 0.02, pluck(76, 0.5, 1.2), 0.16)
# title and bridge
place(FX, T["title"] - 0.3, whoosh(0.7, False), 0.2)
place(FX, T["tKilit"] + 0.3, lock_click(0.8), 0.25)
for w in (T["bAdres"], T["bBina"], T["bYol"]): place(FX, w - 0.1, pluck(79, 0.5, 1.2), 0.18)
place(FX, T["bYol"] - 0.05, riser(1.1) * 0.8, 0.18)
place(FX, T["bBugun"] + 0.1, whoosh(1.3, False), 0.24)
place(FX, T["bKilit"] - 0.05, blip(900, 1300, 0.1), 0.16)
# section intros
for s0 in (T["h0"], T["s0"], T["cIste"]):
    place(FX, s0 - 0.25, whoosh(0.6, True), 0.2)
    place(FX, s0 + 0.05, impact(0.2))
# HTTP: postcards on the road, the café's Wi-Fi, the password read by someone else
for k in range(10): place(FX, T["hTel"] + 0.3 + k * 1.05, pan(paper(), (k % 3 - 1) * 0.5), 0.05)
place(FX, T["hHttp"] - 0.1, blip(1100, 1500, 0.08), 0.13)
place(FX, T["hKafe"] - 0.3, whoosh(0.5, True), 0.12)
for k in range(3): place(FX, T["hWifi"] + k * 0.11, blip(1500 + 350 * k, 1800 + 350 * k, 0.06), 0.14)
for k in range(4): place(FX, T["hSifre"] - 0.05 + k * 0.12, tick(3800), 0.18)
place(FX, T["hOku"] - 0.2, whoosh(0.4, True), 0.14)
place(FX, T["hOku"], S(err_tone(), lp(blip(160, 90, 0.4), 500) * 0.8), 0.28)
# HTTPS: the postcards click shut into boxes, the keys, the grab, the gibberish
for k in range(6): place(FX, T["sKutu"] + 0.05 + k * 0.2, pan(lock_click(0.6), (k % 3 - 1) * 0.4), 0.2)
place(FX, T["sKoyar"] + 0.1, bell(84, 1.0, 0.6), 0.12)
place(FX, T["sS"] - 0.05, blip(1200, 1600, 0.08), 0.12)
place(FX, T["sAnahtar"] - 0.3, whoosh(1.3, False), 0.18)
place(FX, T["sTarayici"] - 0.05, keyjingle(), 0.2); place(FX, T["sSunucu"] - 0.05, keyjingle(), 0.2)
place(FX, T["sYolda"] + 0.1, whoosh(1.4, True), 0.18)
place(FX, T["sGecir"] + 0.2, lp(sweep_noise(0.6, 150, 900, shape=0.8), 1200) * 2, 0.2)
place(FX, T["sAnlamsiz"] - 0.45, glitch(1.4), 0.12)
# certificate: the ID card, the stamp, the checks, the padlock
place(FX, T["cSSL"] - 0.35, whoosh(0.45, True), 0.13)
place(FX, T["cKimlik"] + 0.2, blip(1300, 1700, 0.07), 0.12)
place(FX, T["cKurum"] - 0.02, S(lp(blip(180, 70, 0.25), 600) * 1.2, tick(1200) * 2), 0.35)
for k, c in enumerate((T["cGecerli"], T["cAdres"], T["cSure"])): place(FX, c - 0.02, S(blip(1200 + 200 * k, 1700 + 200 * k, 0.08), pluck(79 + 4 * k, 0.4)), 0.2)
place(FX, T["cHer"] + 0.1, whoosh(1.4, False), 0.2)
place(FX, T["cKapi"] - 0.1, lp(sweep_noise(0.5, 120, 600, shape=0.8), 900) * 1.5, 0.15)
place(FX, T["cKilit"] + 0.18, lock_click(1.3), 0.4)
place(FX, T["cKilit"] + 0.25, bell(79, 1.8), 0.18); place(FX, T["cKilit"] + 0.3, bell(84, 1.8), 0.12)
# without a certificate: the lock comes off, the warning, the visitors turn back
place(FX, T["w0"] + 0.05, S(lock_click(0.7)[::-1] * 0.6, blip(900, 300, 0.4)), 0.25)
place(FX, T["wWarn"] - 0.05, err_tone(), 0.3)
for k in range(6): place(FX, T["wCogu"] + 0.3 + k * 0.15, pan(pluck(69 - 2 * k, 0.4, 0.8), (k - 2.5) / 3), 0.1)
place(FX, T["wGoogle"] + 0.3, whoosh(0.8, True), 0.14); place(FX, T["wGoogle"] + 1.05, blip(1300, 1800, 0.08), 0.16)
# the good news: the hosting panel, the lock comes back, renews itself
place(FX, T["p0"] - 0.2, whoosh(0.45, True), 0.13)
place(FX, T["pHosting"] + 0.55, S(tick(2200) * 1.5, blip(1000, 1400, 0.06)), 0.25)
place(FX, T["pUcretsiz"] - 0.05, bell(88, 0.8, 0.5), 0.14)
place(FX, T["pUcretsiz"] + 0.88, lock_click(1.1), 0.34)
place(FX, T["pYeniler"] + 0.1, S(tick(2200) * 1.5, blip(1000, 1400, 0.06)), 0.25)
place(FX, T["pYeniler"] + 0.1, sweep_noise(1.2, 800, 3000, shape=1.0) * 0.5, 0.16)
place(FX, T["pAdres"] - 0.1, blip(1100, 900), 0.13); place(FX, T["pWarn"] + 0.55, blip(1200, 1600), 0.13)
place(FX, T["pKilitli"] + 0.2, bell(84, 1.4) + bell(91, 1.4) * 0.5, 0.14)
# recap = glossary, save, next episode
place(FX, T["r0"] - 0.5, whoosh(0.7, True), 0.18)
for w in (T["gHttp"], T["gHttps"], T["gSsl"]): place(FX, w - 0.1, pluck(84, 0.45, 1.2), 0.14)
place(FX, T["saveW"] - 0.02, S(blip(1300, 2000, 0.07), tick(3000)), 0.28)
place(FX, T["saveW"] + 0.12, bell(91, 1.0, 0.5), 0.1)
place(FX, T["next"] - 0.3, whoosh(0.6, True), 0.18)
for k in range(4): place(FX, T["posta"] - 0.45 + k * 0.16, paper(), 0.06)
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
