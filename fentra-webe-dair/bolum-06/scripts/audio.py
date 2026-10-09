"""Music, sound design and mix for WEB'E DAİR · Bölüm 6 (season finale) -> bolum-06/output/_audio.wav

Same approach as episodes 1-5: everything except the voice is synthesized and locked to the word-level cues
(bolum-06/output/cues.json). A 112 bpm bed (Dm – B♭ – F – C) that ducks under the voice and drops out for a moment as your
pin vanishes from the map; typing and pins dropping on a phone map, your pin landing, the card filling up, phones lighting
up, footsteps to the shop next door, a verification code, reviews popping up and a calm reply, a closed door, the whole
season lighting up pin by pin into a "SEZON 1 TAMAM" hit, a stamp, and the Fentra sonic logo. Normalized to -14 LUFS with a
-1.2 dBTP ceiling. Without the recording yet, the voice track is silent.
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
    yakin=at("hook", 0, "yakınımdaki"), yazdi=at("hook", 0, "yazdı"), uc=at("hook", 1, "üç"), yildiz=at("hook", 1, "yıldızlarıyla"),
    tarif=at("hook", 1, "tarifiyle"), sizin=at("hook", 2, "Sizin"), hookEnd=SC["hook"]["end"],
    title=at("title", 0, "Web'e"), ep=at("title", 1, "Altıncı"), tHarita=at("title", 1, "haritadaki"), titleEnd=SC["title"]["end"],
    b0=at("bridge", 0, "Siteniz"), bHazir=at("bridge", 0, "hazır"), bHizli=at("bridge", 0, "hızlı"), bGuven=at("bridge", 0, "güvende"),
    bAma=at("bridge", 1, "Ama"), bHarita=at("bridge", 1, "haritada"),
    k0=at("card", 0, "Google"), kKart=at("card", 0, "kartıdır"), kArama=at("card", 1, "Aramada"), kAdres=at("card", 1, "adresiniz"),
    kSaat=at("card", 1, "çalışma"), kTel=at("card", 1, "telefonunuz"), kFoto=at("card", 1, "fotoğraflarınız"), kYorum=at("card", 1, "yorumlarınız"),
    kHepsi=at("card", 1, "hepsi"),
    w0=at("why", 0, "Yakınında"), wKarar=at("why", 0, "karar"), wKarti=at("why", 1, "Kartı"), wGorunmez=at("why", 1, "görünmez"),
    wMusteri=at("why", 2, "Müşteri"), wDukkan=at("why", 2, "dükkana"), wEnd=SC["why"]["end"],
    s0=at("setup", 0, "Kurmak"), sEkler=at("setup", 1, "İşletmenizi"), sDogru=at("setup", 1, "doğrularsınız"), sSonra=at("setup", 2, "Sonra"),
    sAdres=at("setup", 2, "adres"), sSaat=at("setup", 2, "saat"), sTel=at("setup", 2, "telefon"), sSite=at("setup", 2, "sitenizin"),
    sBu=at("setup", 3, "Bu"), sAyni=at("setup", 3, "aynı"),
    v0=at("reviews", 0, "Yorumlar"), vMemnun=at("reviews", 1, "Memnun"), vCevap=at("reviews", 1, "cevap"), vOlumsuz=at("reviews", 1, "olumsuz"),
    vGuven=at("reviews", 2, "güven"), vEnd=SC["reviews"]["end"],
    h0=at("hours", 0, "Bayramda"), hDegis=at("hours", 0, "değişti"), hGunc=at("hours", 1, "güncelleyin"), hYanlis=at("hours", 2, "Yanlış"),
    hKapi=at("hours", 2, "kapıda"), hGelmez=at("hours", 2, "gelmez"), hEnd=SC["hours"]["end"],
    r0=at("recap", 0, "Kısacası"), gIgne=at("recap", 0, "iğneniz"), gSezon=at("recap", 1, "sezonun"), gTamam=at("recap", 1, "tamam"),
    save=at("outro", 0, "Bu"), saveW=at("outro", 0, "kaydedin"), next=at("outro", 1, "Sıradaki"), nSeo=at("outro", 1, "SEO"),
    endCard=at("outro", 2, "Web'e"), fentra=at("outro", 2, "Fentra'yla"),
)
T.update(bAdres=T["bHazir"] - 0.2, bBina=T["bHazir"] + 0.05, bYol=T["bHazir"] + 0.3, bPosta=T["bHazir"] + 0.55, bKuyruk=T["bHizli"], bKilit=T["bGuven"])
RIV0 = T["bAma"] + 0.2                               # the rivals' pins drop (same as world.js)
CLOSED0 = T["h0"] + 0.1                              # the "KAPALI" sign goes up
GONE_A, GONE_B = T["wGorunmez"] - 0.1, T["wMusteri"] - 0.1   # the beat drops out while your pin is gone

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
VOFILE = ROOT.parent / "assets/vo" / f"{ROOT.name}.mp3"         # bolum-NN/ -> assets/vo/bolum-NN.mp3
meter = pyln.Meter(SR)
if VOFILE.exists():
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "quiet", "-i", str(VOFILE), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    vo = np.frombuffer(raw, np.float32).astype(np.float64)
    # the recording must be the one the cues were aligned to
    assert abs(len(vo) / SR - C["voDuration"]) < 0.05, f"{VOFILE.name} is {len(vo) / SR:.2f}s but the cues were aligned to a {C['voDuration']}s recording"
    vo = hp(vo, 75, 2)
    vo = np.concatenate([vo, np.zeros(max(0, N - len(vo)))])[:N]
    vo *= 10 ** ((-17.0 - meter.integrated_loudness(vo)) / 20)
else:
    print("no recording yet: silent voice track")
    vo = np.zeros(N)
VO = pan(vo) * 1.0
VO = VO * 0.93 + verb(vo, IR_ROOM, 0.12) * 0.07

# sidechain envelope from the voice
if vo.any():
    e = np.abs(vo); win = int(0.03 * SR)
    e = np.convolve(e, np.ones(win) / win, mode="same")
    e = e / (np.percentile(e[e > 1e-4], 95) + 1e-9)
else:                                               # no recording yet: duck where the words will be
    e = np.zeros(N)
    for w in C["words"]: e[int(w["start"] * SR):int(w["end"] * SR)] = 1.0
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
CH = [(38, [57, 60, 62, 65]), (46, [58, 62, 65, 69]), (41, [57, 60, 65, 69]), (48, [60, 64, 67, 74])]   # Dm(add9) B♭maj7 Fmaj7 C(add9)

# hook: a quiet, curious pad with soft ticks, a question on "Sizin", rising into the title
place(MUS, 0.0, pad([57, 62, 69, 72], T["title"] + 0.2, cutoff=1300) * 0.22)
for k in range(int(T["title"] / (SPB / 2))):
    tt0 = k * SPB / 2 + 0.05
    place(MUS, tt0, pan(S(tick(9000, 0.18), hat() * 0.12), 0.3 if k % 2 else -0.3), 0.4 + 0.5 * (tt0 / T["title"]))
place(MUS, T["sizin"] - 0.05, pad([50, 57, 64], 2.2, cutoff=900) * 0.26)
place(MUS, T["title"] - 1.2, riser(1.2), 0.3)
place(MUS, T["title"], impact(0.8))

# groove: title → outro
end_groove = T["endCard"]
nb = int((end_groove - B0) / SPB)
LIFT_A, LIFT_B = T["gSezon"] - 0.3, T["gTamam"] - 0.05    # the season lights up: drums out, a riser into "tamam"
def silent(x): return GONE_A <= x < GONE_B or LIFT_A <= x < LIFT_B
for b in range(nb):
    tb = beat(b)
    if silent(tb): continue
    bar, pos = divmod(b, 4)
    energy = 0.75 if tb < T["k0"] else 1.15 if T["gTamam"] <= tb < T["next"] else 1.0
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
        if te >= end_groove or GONE_A <= te < GONE_B: continue
        place(MUS, te, pan(bass(root - 12 + (12 if e8 % 8 == 6 else 0), SPB / 2 * 0.95), 0), 0.34)
    arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[3] + 12, notes[2] + 12, notes[1] + 12, notes[3], notes[2] + 12]
    for s in range(32):
        ts = t0 + s * SPB / 4
        if ts >= end_groove or silent(ts) or ts < T["b0"] - 0.5: continue
        g = 0.09 if s % 2 == 0 else 0.06
        place(MUS, ts, pan(pluck(arp[s % 8], 0.35), -0.35 if s % 4 < 2 else 0.35), g)
# sidechain pump from the kick
pump = np.ones(N)
for b in range(nb):
    i = int(beat(b) * SR); L = int(0.22 * SR)
    if 0 <= i < N: pump[i:i + L] = np.minimum(pump[i:i + L], 1 - 0.35 * np.exp(-np.arange(min(L, N - i)) / SR / 0.07))
MUS[:, 0] *= pump; MUS[:, 1] *= pump
# your pin is gone: a low, hollow drone; the season lights up: a riser into the big hit
place(MUS, GONE_A, pad([26, 33, 38, 41], GONE_B - GONE_A + 0.6, cutoff=600) * 0.4)
place(MUS, LIFT_A, riser(LIFT_B - LIFT_A + 0.05), 0.26)
place(MUS, T["gTamam"] - 0.02, impact(0.9))
place(MUS, T["gTamam"] - 0.02, pad([53, 57, 60, 65, 69, 72], 2.6, cutoff=3200) * 0.34)      # F major, bright
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
def err_tone():
    return S(blip(700, 640, 0.14), np.concatenate([np.zeros(int(0.13 * SR)), blip(520, 470, 0.2)]))
def paper():
    x = hp(sweep_noise(0.22, 2500, 7000, shape=1.5), 1500)
    return x / (np.abs(x).max() + 1e-9)
def mail_in():                                      # a letter dropping into the box
    return S(paper() * 0.6, np.concatenate([np.zeros(int(0.12 * SR)), lp(blip(260, 140, 0.12), 900) * 1.2, tick(1800) * 1.2]))
def thump(g=1.0):
    return S(lp(blip(180, 70, 0.25), 600) * 1.2, tick(1200) * 2) * g
def notif_chime():
    return S(bell(84, 0.6, 0.5), np.concatenate([np.zeros(int(0.11 * SR)), bell(88, 0.7, 0.5)]))

def step(g=1.0):                                    # a soft footstep
    return lp(S(tick(900) * 1.2, blip(150, 90, 0.05)), 1400) * g
def glitch():                                       # a piece of the page blinking out
    return S(hp(sweep_noise(0.08, 4000, 1500, shape=1.0), 1200) * 0.8, blip(900, 300, 0.06))
def rumble(dur):                                    # the building coming down
    x = lp(sweep_noise(dur, 180, 60, shape=1.0), 260) * np.linspace(1, 0.2, int(dur * SR)) ** 1.5
    return x / (np.abs(x).max() + 1e-9)
def crackle(dur):                                   # fire
    out = np.zeros(int(dur * SR))
    for k in range(int(dur * 40)):
        i = int(rng.random() * (len(out) - 2000)); b = hp(tick(1500 + 3000 * rng.random()), 900); out[i:i + len(b)] += b * rng.random()
    return out + lp(sweep_noise(dur, 400, 300, shape=1.0), 700) * 0.3
def clunk(g=1.0):                                   # a heavy safe door / a lock
    return S(lp(blip(140, 80, 0.2), 500) * 1.3, tick(2200) * 1.4, np.concatenate([np.zeros(int(0.06 * SR)), tick(1600)])) * g

def key():                                          # one keystroke on the phone
    return S(tick(3800 + 900 * rng.random(), 0.9), blip(1700, 1500, 0.025) * 0.25)
def pin_drop(m=79, g=1.0):                          # a map pin falling into place
    return S(blip(1900, 700, 0.12) * 0.5, np.concatenate([np.zeros(int(0.1 * SR)), pluck(m, 0.4, 1.2), lp(thump(0.6), 1500)])) * g
def pop(m=86):                                      # a chip / review bubble appearing
    return S(blip(900, 1600, 0.05) * 0.6, pluck(m, 0.3, 1.3) * 0.8)
def success():
    return S(bell(84, 1.0, 0.6), np.concatenate([np.zeros(int(0.09 * SR)), bell(91, 1.1, 0.6) * 0.8]))

# hook: typing the search, three pins drop, stars, directions, and you're not there
q = "yakınımdaki kuaför"; t_a, t_b = T["yakin"] - 0.5, T["yazdi"] + 0.2
for k, ch in enumerate(q):
    if ch != " ": place(FX, t_a + (k + 0.5) * (t_b - t_a) / len(q), pan(key(), 0.15), 0.12)
place(FX, T["yazdi"] + 0.3, S(blip(1200, 1800, 0.06), tick(2600)), 0.16)
for k in range(3): place(FX, T["uc"] - 0.2 + k * 0.15, pan(pin_drop(76 + 3 * k), (k - 1) * 0.3), 0.15)
for k in range(3): place(FX, T["yildiz"] + 0.3 + k * 0.1, pan(pluck(88 + 2 * k, 0.3, 1.3), (k - 1) * 0.3), 0.09)
for k in range(3): place(FX, T["tarif"] + 0.3 + k * 0.1, pan(blip(1100, 1500, 0.05), (k - 1) * 0.3), 0.1)
place(FX, T["sizin"] - 0.1, err_tone(), 0.2)
place(FX, T["sizin"] + 0.7, pop(81), 0.18)
# title and bridge
place(FX, T["title"] - 0.3, whoosh(0.7, False), 0.2)
for k in range(3): place(FX, T["tHarita"] - 0.5 + k * 0.12, tick(5200 + 500 * k), 0.12)
place(FX, T["tHarita"] + 0.2, pluck(84, 0.5, 1.2), 0.12)
for w in (T["bAdres"], T["bBina"], T["bYol"], T["bKilit"], T["bPosta"]): place(FX, w - 0.1, pluck(79, 0.5, 1.2), 0.17)
for k in range(6): place(FX, T["bKuyruk"] - 0.3 + k * 0.25, pan(step(), ((k * 3) % 5 - 2) / 3), 0.07)
place(FX, T["bAma"] - 0.1, whoosh(1.4, True), 0.16)
for k in range(8): place(FX, RIV0 + k * 0.12 + 0.3, pan(pin_drop(72 + (k % 4) * 2, 0.8), ((k * 3) % 5 - 2) / 3), 0.1)
place(FX, T["bHarita"] + 0.3, pop(74), 0.16)
# section intros
for s0 in (T["k0"], T["s0"], T["v0"]):
    place(FX, s0 - 0.25, whoosh(0.6, True), 0.2)
    place(FX, s0 + 0.05, impact(0.2))
# 01: your pin lands, the card fills up
place(FX, T["k0"] + 0.4, S(impact(0.5), pin_drop(84, 1.4), bell(91, 1.4, 0.7) * 0.6), 0.24)
place(FX, T["kArama"] - 0.2, whoosh(0.5, True), 0.12)
for k, w in enumerate((T["kAdres"], T["kSaat"], T["kTel"], T["kFoto"], T["kYorum"])): place(FX, w - 0.05, S(blip(1100 + 120 * k, 1500 + 120 * k, 0.06), pluck(76 + 2 * k, 0.4)), 0.15)
for k in range(3): place(FX, T["kFoto"] + k * 0.1, tick(3400 + 400 * k), 0.08)
place(FX, T["kHepsi"] + 0.1, S(bell(88, 1.2, 0.6), bell(84, 1.2, 0.6) * 0.6), 0.14)
# why: phones light up; your card is missing; your pin goes; they walk to the shop with a pin
place(FX, T["w0"] - 0.4, whoosh(0.9, False), 0.14)
for k in range(4): place(FX, T["wKarar"] + 0.2 + k * 0.1, pan(notif_chime(), (k - 1.5) / 2), 0.06)
place(FX, T["wKarti"] - 0.05, err_tone(), 0.18)
place(FX, T["wGorunmez"] - 0.15, S(blip(900, 160, 0.5), sweep_noise(0.6, 3000, 300, shape=1.0) * 0.5, lp(blip(220, 70, 0.6), 500)), 0.24)
place(FX, T["wGorunmez"] + 0.15, pop(69), 0.12)
for k in range(14): place(FX, T["wDukkan"] - 0.4 + k * 0.19, pan(step(1.1), 0.3 + 0.1 * (k % 3)), 0.1)
place(FX, T["wDukkan"] + 0.3, S(bell(86, 1.0, 0.5), pluck(81, 0.4, 1.2)), 0.14)
# 02: add, verify, fill in, the same everywhere
for k in range(10): place(FX, T["sEkler"] - 0.2 + (k + 0.5) * 0.08, pan(key(), -0.1), 0.11)
for k in range(4): place(FX, T["sDogru"] - 0.6 + k * 0.12, S(tick(2600 + 300 * k), blip(1300 + 100 * k, 1500 + 100 * k, 0.04)), 0.13)
place(FX, T["sDogru"] - 0.05, S(pin_drop(84, 1.3), impact(0.3)), 0.2)
place(FX, T["sDogru"] + 0.15, success(), 0.16)
for k, w in enumerate((T["sAdres"], T["sSaat"], T["sTel"], T["sSite"])): place(FX, w - 0.05, S(tick(3000), pluck(76 + 3 * k, 0.4, 1.2)), 0.15)
for k in range(3): place(FX, T["sBu"] + 0.1 + k * 0.25, blip(1200 + 150 * k, 1600 + 150 * k, 0.05), 0.12)
place(FX, T["sAyni"] + 0.05, S(bell(84, 1.3, 0.6), bell(88, 1.3, 0.6) * 0.7, bell(91, 1.3, 0.6) * 0.5), 0.14)
# 03: people leave with reviews; a reply to every one; then the closed door
for k in range(5):
    t0 = T["v0"] + 0.2 + k * 0.55
    for j in range(5): place(FX, t0 + j * 0.34, pan(step(0.9), (k - 2) / 3), 0.07)
    place(FX, T["v0"] + 1.0 + k * 0.55, pan(pop(81 if k == 2 else 86 + (k % 2) * 2), (k - 2) / 3), 0.14 if k != 2 else 0.12)
place(FX, T["v0"] + 1.05 + 2 * 0.55, lp(blip(500, 380, 0.18), 1500), 0.1)          # the 2-star one, a little sour
for k in range(2): place(FX, T["vCevap"] + k * 0.25, S(key(), blip(1300, 1700, 0.05)), 0.12)
place(FX, T["vOlumsuz"] + 0.1, S(key(), blip(1300, 1700, 0.05)), 0.12)
place(FX, T["vOlumsuz"] + 0.55, S(success(), pluck(88, 0.5, 1.2) * 0.5), 0.16)
place(FX, T["vGuven"] + 0.2, S(bell(91, 1.4, 0.6), bell(96, 1.4, 0.6) * 0.5), 0.12)
place(FX, CLOSED0 - 0.05, S(clunk(0.7), lp(tick(900), 1200)), 0.2)
place(FX, T["hGunc"] - 0.05, S(tick(2600), blip(900, 1300, 0.06)), 0.18)
place(FX, T["hGunc"] + 0.2, success(), 0.1)
vt0, vT = T["hYanlis"] - 1.2, T["hKapi"] + 0.3
for k in range(int((vT - vt0) / 0.36)): place(FX, vt0 + k * 0.36, pan(step(1.1), 0.1), 0.11)
for k in range(4): place(FX, vT + 0.1 + k * 0.09, pan(lp(tick(1300 + 200 * (k % 2)), 2500), 0.1), 0.18)    # rattling a locked door
place(FX, T["hKapi"] + 0.4, err_tone(), 0.2)
for k in range(7): place(FX, vT + 0.8 + k * 0.36, pan(step(0.9), -0.1), 0.08)
place(FX, T["hGelmez"] + 0.05, lp(blip(400, 150, 0.3), 900), 0.12)
# recap: your pin; the whole season lights up, pin by pin; SEZON 1 TAMAM
place(FX, T["r0"] - 0.5, whoosh(0.9, True), 0.18)
place(FX, T["gIgne"] - 0.1, S(pin_drop(84, 1.2), bell(91, 1.3, 0.6) * 0.6), 0.18)
SEASON = [72, 74, 76, 77, 79, 81, 83, 84]
for k, m in enumerate(SEASON): place(FX, T["gSezon"] - 0.1 + k * ((T["gTamam"] - T["gSezon"]) / 8) + 0.1, pan(pluck(m, 0.45, 1.3), ((k % 3) - 1) * 0.35), 0.15)
place(FX, T["gTamam"] - 0.03, S(bell(84, 2.2), bell(88, 2.2) * 0.7, bell(91, 2.2) * 0.6, bell(96, 2.2) * 0.4), 0.26)
# season card, stamp, next season
G0, N0 = T["save"] - 0.2, T["next"] + 0.75                  # season card in; next-season panel in (as overlay.js)
place(FX, G0 - 0.3, whoosh(0.6, True), 0.16)
for k in range(8): place(FX, G0 + 0.1 + k * 0.07, pan(tick(3600 + 200 * k), (k - 3.5) / 5), 0.07)
place(FX, T["saveW"] - 0.02, S(blip(1300, 2000, 0.07), tick(3000)), 0.28)
place(FX, T["saveW"] + 0.12, bell(91, 1.0, 0.5), 0.1)
place(FX, T["saveW"] + 0.45, S(thump(1.2), clunk(0.8), impact(0.15)), 0.24)        # the stamp
place(FX, N0 - 0.3, whoosh(0.6, True), 0.18)
for k in range(4): place(FX, N0 + 0.6 + k * 0.12, pluck(79 + 2 * k, 0.35, 1.2), 0.1)
place(FX, T["nSeo"] + 0.1, S(blip(700, 1400, 0.1), pluck(88, 0.4, 1.2)), 0.14)
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
