"""Music, sound design and mix for WEB'E DAİR · Bölüm 5 -> bolum-05/output/_audio.wav

Same approach as episodes 1-4: everything except the voice is synthesized and locked to the word-level cues
(bolum-05/output/cues.json). A 112 bpm bed (Dm – B♭ – F – C) that ducks under the voice and drops out while the
building is down; glitches as the site empties, sparks, a shove, footsteps and a deletion, a collapse, the safe and the
spare key, a restore that climbs floor by floor, fire, a copy to the cloud, the daily clock, a key that fits and one that
doesn't, a rusty lock and a new one, and the Fentra sonic logo. Normalized to -14 LUFS with a -1.2 dBTP ceiling.
Without the recording yet, the voice track is silent.
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
    sayfalar=at("hook", 1, "Sayfalar"), urunler=at("hook", 1, "ürünler"), yillarca=at("hook", 1, "yıllarca"), gitmis=at("hook", 1, "gitmiş"),
    yedeginiz=at("hook", 2, "Yedeğiniz"), hookEnd=SC["hook"]["end"],
    title=at("title", 0, "Web'e"), ep=at("title", 1, "Beşinci"), tAnahtar=at("title", 1, "anahtar"), titleEnd=SC["title"]["end"],
    b0=at("bridge", 0, "Siteniz"), bHazir=at("bridge", 0, "hazır"), bHizli=at("bridge", 0, "hızlı"), bGuven=at("bridge", 0, "güvende"),
    bCok=at("bridge", 1, "çökerse"),
    c0=at("crash", 0, "Siteler"), cSunucu=at("crash", 1, "Sunucu"), cGuncel=at("crash", 1, "güncelleme"), cKotu=at("crash", 1, "kötü"),
    cSizar=at("crash", 1, "sızar"), cDosya=at("crash", 2, "dosyayı"), cSil=at("crash", 2, "silersiniz"),
    k0=at("backup", 0, "Yedek"), kKopya=at("backup", 0, "kopyasıdır"), kDosya=at("backup", 0, "dosyalar"), kGorsel=at("backup", 0, "görseller"),
    kVeri=at("backup", 0, "veritabanı"), kKasa=at("backup", 1, "kasada"), kAnahtar=at("backup", 1, "anahtar"), kGeri=at("backup", 2, "geri"),
    kEski=at("backup", 2, "eski"),
    o0=at("offsite", 0, "Ama"), oAyni=at("offsite", 0, "aynı"), oYan=at("offsite", 1, "yanarsa"), oKasa=at("offsite", 1, "kasa"),
    oBaska=at("offsite", 2, "başka"), oBulut=at("offsite", 2, "bulutta"),
    a0=at("auto", 0, "En"), aHer=at("auto", 0, "her"), aDene=at("auto", 1, "geri"), aDeneyin=at("auto", 1, "deneyin"),
    aDenen=at("auto", 2, "Denenmemiş"), aKilide=at("auto", 2, "kilide"), aUymayan=at("auto", 2, "uymayan"), aEnd=SC["auto"]["end"],
    u0=at("update", 0, "İkinci"), uYazilim=at("update", 1, "yazılımı"), uEski=at("update", 1, "eski"), uSaldir=at("update", 2, "Saldırganlar"),
    uOnce=at("update", 3, "önce"), uYedek=at("update", 3, "yedek"), uEnd=SC["update"]["end"],
    h0=at("host", 0, "İyi"), hOto=at("host", 0, "otomatik"), hVar=at("host", 1, "var"), hSik=at("host", 1, "sıklıkla"), hNerede=at("host", 1, "nerede"),
    r0=at("recap", 0, "Kısacası"), gYedek=at("recap", 0, "Yedek"), gGunc=at("recap", 1, "Güncelleme"),
    save=at("outro", 0, "Bu"), saveW=at("outro", 0, "kaydedin"), next=at("outro", 1, "Sıradaki"), harita=at("outro", 1, "haritadaki"),
    endCard=at("outro", 2, "Web'e"), fentra=at("outro", 2, "Fentra'yla"),
)
T.update(bAdres=T["bHazir"] - 0.2, bBina=T["bHazir"] + 0.05, bYol=T["bHazir"] + 0.3, bPosta=T["bHazir"] + 0.55, bKuyruk=T["bHizli"], bKilit=T["bGuven"])
FALL0 = T["cSil"] + 0.1; REST0 = T["kGeri"] + 0.25; REST1 = REST0 + 2.4; NEWLOCK = T["uYedek"] + 0.5

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
VOFILE = ROOT.parent / "assets/vo" / f"{ROOT.name}.mp3"         # bolum-05/ -> assets/vo/bolum-05.mp3
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

# hook: a quiet pad that sours as the page empties, rising into the title
place(MUS, 0.0, pad([57, 62, 69, 72], T["title"] + 0.2, cutoff=1300) * 0.22)
for k in range(int(T["title"] / (SPB / 2))):
    tt0 = k * SPB / 2 + 0.05
    place(MUS, tt0, pan(S(tick(9000, 0.18), hat() * 0.12), 0.3 if k % 2 else -0.3), 0.4 + 0.5 * (tt0 / T["title"]))
place(MUS, T["gitmis"] - 0.05, pad([38, 45, 51], 2.4, cutoff=700) * 0.3)
place(MUS, T["title"] - 1.2, riser(1.2), 0.3)
place(MUS, T["title"], impact(0.8))

# groove: title → outro
end_groove = T["endCard"]
nb = int((end_groove - B0) / SPB)
rewind_a, rewind_b = FALL0 + 0.2, REST0 - 0.1         # the beat drops out while the building is down
for b in range(nb):
    tb = beat(b)
    if rewind_a <= tb < rewind_b: continue
    bar, pos = divmod(b, 4)
    energy = 0.75 if tb < T["c0"] else 1.0
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
# while the building is down: a low drone, then a riser into the restore
place(MUS, rewind_a, pad([26, 33, 38, 41], rewind_b - rewind_a + 0.6, cutoff=600) * 0.4)
place(MUS, rewind_b - 1.0, riser(1.0), 0.24)
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

# hook: the page empties out
place(FX, T["sayfalar"] - 0.05, glitch(), 0.22); place(FX, T["sayfalar"] + 0.12, glitch(), 0.18)
for k in range(4): place(FX, T["urunler"] + k * 0.14, pan(glitch(), (k - 1.5) / 2), 0.18)
for k in range(4): place(FX, T["yillarca"] + k * 0.18, pan(glitch(), (k - 1.5) / 3), 0.12)
place(FX, T["gitmis"] - 0.05, err_tone(), 0.24)
place(FX, T["yedeginiz"] + 0.02, pluck(74, 0.5, 1.2), 0.16)
# title and bridge
place(FX, T["title"] - 0.3, whoosh(0.7, False), 0.2)
for k in range(3): place(FX, T["tAnahtar"] - 0.4 + k * 0.08, tick(5200 + 500 * k), 0.12)
for w in (T["bAdres"], T["bBina"], T["bYol"], T["bKilit"], T["bPosta"]): place(FX, w - 0.1, pluck(79, 0.5, 1.2), 0.17)
for k in range(8): place(FX, T["bKuyruk"] - 0.4 + k * 0.25, pan(step(), ((k * 3) % 5 - 2) / 3), 0.08)
place(FX, T["bCok"] - 0.05, S(lp(rumble(1.2), 300), lp(blip(120, 60, 0.6), 300)), 0.3)
# section intros
for s0 in (T["c0"], T["k0"], T["u0"]):
    place(FX, s0 - 0.25, whoosh(0.6, True), 0.2)
    place(FX, s0 + 0.05, impact(0.2))
# 01: sparks, a shove, footsteps in, a deletion, the fall
for k in range(14): place(FX, T["cSunucu"] + 0.05 + 0.6 * rng.random(), pan(hp(tick(3000 + 4000 * rng.random()), 1500), rng.random() - 0.5), 0.1)
place(FX, T["cSunucu"] - 0.02, err_tone(), 0.18)
place(FX, T["cGuncel"] + 0.1, S(lp(blip(200, 90, 0.3), 600), sweep_noise(0.3, 900, 300, shape=1.0) * 0.5), 0.24)
for k in range(6): place(FX, T["cKotu"] - 0.4 + k * 0.32, pan(step(1.2), -0.2), 0.12)
place(FX, T["cSizar"] + 0.3, lp(blip(300, 120, 0.3), 700), 0.14)
place(FX, T["cDosya"] + 0.15, S(blip(1400, 200, 0.3), hp(sweep_noise(0.3, 6000, 800, shape=1.0), 900) * 0.6), 0.2)
place(FX, FALL0 - 0.05, S(impact(1.0), rumble(2.2)), 0.42)
for k in range(8): place(FX, FALL0 + 0.2 + k * 0.12, pan(lp(thump(0.8), 900), (k % 5 - 2) / 3), 0.16)
# 02: the safe rises and opens, the copy, the key, the restore floor by floor
place(FX, T["k0"] - 0.1, S(clunk(1.0), whoosh(0.5, True) * 0.5), 0.26)
place(FX, T["kKopya"] - 0.55, S(*[np.concatenate([np.zeros(int(k * 0.07 * SR)), tick(2400 + 300 * k)]) for k in range(6)]), 0.12)
place(FX, T["kKopya"] - 0.1, S(clunk(0.8), lp(sweep_noise(0.6, 300, 900, shape=0.8), 1200) * 0.5), 0.22)
for k, w in enumerate((T["kDosya"], T["kGorsel"], T["kVeri"])): place(FX, w - 0.05, S(blip(1100 + 150 * k, 1500 + 150 * k, 0.06), pluck(79 + 3 * k, 0.4)), 0.16)
place(FX, T["kKasa"] - 0.1, S(bell(88, 1.4), bell(95, 1.4) * 0.5), 0.16)
place(FX, T["kGeri"] - 0.05, S(blip(1300, 2000, 0.07), tick(3000)), 0.24)
place(FX, REST0 - 0.3, whoosh(0.8, True), 0.2)
for f in range(9): place(FX, REST0 + f * (REST1 - REST0) / 9, pan(pluck(67 + [0, 2, 4, 5, 7, 9, 11, 12, 14][f], 0.35, 1.2), (f % 3 - 1) * 0.3), 0.14)
place(FX, REST1 + 0.05, S(impact(0.5), bell(84, 1.6), bell(88, 1.6) * 0.6, bell(91, 1.6) * 0.4), 0.2)
# not in the same building: fire, then up to the cloud
place(FX, T["oAyni"] - 0.05, blip(900, 1300, 0.08), 0.12)
place(FX, T["oYan"] - 0.2, crackle(T["oBaska"] - T["oYan"] + 0.6), 0.12)
place(FX, T["oKasa"] + 0.1, err_tone(), 0.16)
place(FX, T["oBaska"] - 0.3, whoosh(0.9, True), 0.16)
place(FX, T["oBulut"] - 0.1, S(whoosh(1.2, True) * 0.6, bell(91, 1.2, 0.6)), 0.18)
# daily backups, a key that fits, a key that doesn't
for k in range(8): place(FX, T["aHer"] - 0.2 + k * 0.45, pan(S(tick(4200), blip(1500, 1900, 0.04) * 0.5), 0.3 * ((k % 2) * 2 - 1)), 0.1)
place(FX, T["aDene"] + 0.85, clunk(0.6), 0.18)
place(FX, T["aDeneyin"] + 0.1, S(clunk(0.9), pluck(84, 0.4, 1.2), bell(91, 1.0, 0.6) * 0.6), 0.2)
for k in range(5): place(FX, T["aKilide"] + 0.15 + k * 0.11, pan(tick(1700 + 200 * (k % 2)), (k % 2 - 0.5) * 0.4), 0.16)
place(FX, T["aUymayan"] + 0.05, err_tone(), 0.24)
place(FX, T["aEnd"] + 0.15, lp(blip(400, 150, 0.3), 900), 0.14)
# 03: a rusty lock, attackers, a backup, a new lock
place(FX, T["uEski"] - 0.05, lp(sweep_noise(0.7, 600, 250, shape=0.8), 900), 0.14)
for k in range(10): place(FX, T["uSaldir"] - 0.3 + k * 0.22, pan(step(1.2), ((k * 3) % 5 - 2) / 3), 0.12)
for k in range(4): place(FX, T["uSaldir"] + 1.6 + k * 0.18, pan(tick(1500), (k - 1.5) / 2), 0.12)
place(FX, T["uOnce"] - 0.05, S(blip(1300, 2000, 0.07), tick(3000)), 0.2)
place(FX, NEWLOCK - 0.2, S(clunk(1.0), bell(88, 1.0, 0.8), bell(95, 1.0, 0.8) * 0.5), 0.24)
for k in range(8): place(FX, NEWLOCK + 0.5 + k * 0.25, pan(step(), ((k * 3) % 5 - 2) / 3), 0.07)
# hosting panel: the toggle, three questions
place(FX, T["hOto"] - 0.05, S(tick(2600), blip(900, 1300, 0.06)), 0.2)
for k, w in enumerate((T["hVar"], T["hSik"], T["hNerede"])): place(FX, w - 0.05, pluck(84 + 3 * k, 0.4, 1.2), 0.15)
# recap = glossary, save, next episode
place(FX, T["r0"] - 0.5, whoosh(0.7, True), 0.18)
for w in (T["gYedek"], T["gYedek"] + 1.3, T["gGunc"]): place(FX, w - 0.1, pluck(84, 0.45, 1.2), 0.14)
place(FX, T["saveW"] - 0.02, S(blip(1300, 2000, 0.07), tick(3000)), 0.28)
place(FX, T["saveW"] + 0.12, bell(91, 1.0, 0.5), 0.1)
place(FX, T["next"] - 0.3, whoosh(0.6, True), 0.18)
place(FX, T["harita"] + 0.2, S(blip(700, 1400, 0.1), pluck(88, 0.4, 1.2)), 0.14)
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
