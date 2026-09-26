"""Sound design + score for "Görünmeyen Dükkân" -> output/_audio.wav

Everything is synthesized here and synced to output/cues.json (exported from the animation):
a light afternoon street (distant traffic, a soft breeze, footsteps from the people on screen, a car
and a moped passing), a calm reflective piano that pauses on "…sizi seçemez.", a small sonic lift when
the Fentra signal appears, a drawn shimmer as the blue line traces the shop, a warm musical rise as the
lights come on, a soft crowd and a shop-door bell as customers arrive, and the Fentra motif on the logo.
Optional voice-over recordings (assets/vo/line1.wav … line4.wav) are placed at the caption times,
with music and ambience ducked underneath.
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
CUES = json.loads((OUT / "cues.json").read_text())
T = CUES["T"]
SR = 48000
DUR = float(CUES["duration"])
N = int(round(SR * DUR))
t = np.arange(N) / SR
rng = np.random.default_rng(11)


# ------------------------------------------------------------------ helpers
def env(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def sos(kind, f, order=2):
    return butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, o=2): return sosfilt(sos("low", f, o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos("high", f, o), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(sos("band", [lo, hi], o), x, axis=0)


def pan(m, p=0.0):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], axis=1)


def place(buf, start, sig, gain=1.0):
    i = int(round(start * SR))
    if i >= len(buf) or gain == 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def ir(seconds, damp=6000, pre=0.012, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR); tt = np.arange(n) / SR
    out = np.stack([lp(r.standard_normal(n), damp) * np.exp(-tt * 6.9 / seconds) for _ in range(2)], axis=1)
    d = int(pre * SR); out = np.roll(out, d, axis=0); out[:d] = 0
    return out / np.sqrt(np.sum(out ** 2))


def verb(x, h, wet):
    return np.stack([fftconvolve(x[:, c], h[:, c])[:len(x)] for c in range(2)], axis=1) * wet


def midi(n): return 440.0 * 2 ** ((n - 69) / 12)


def adsr(n, a, d, s, r_, sus_len):
    e = np.zeros(n)
    A, D, R = int(a * SR), int(d * SR), int(r_ * SR)
    S = max(0, min(n - A - D - R, int(sus_len * SR)))
    e[:A] = np.linspace(0, 1, A, endpoint=False) if A else 0
    e[A:A + D] = np.linspace(1, s, D, endpoint=False)
    e[A + D:A + D + S] = s
    e[A + D + S:A + D + S + R] = np.linspace(s, 0, min(R, n - (A + D + S)))
    return e


def win(x, a, b, c, d):
    return np.clip((x - a) / (b - a), 0, 1) * (1 - np.clip((x - c) / (d - c), 0, 1))


# ------------------------------------------------------------------ instruments
def piano(freq, dur=3.0, amp=1.0, bright=1.0):
    """Soft felt piano: a few inharmonic partials, hammer thump, gentle decay."""
    n = int((dur + 1.5) * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    B = 0.0004
    for h, a in ((1, 1.0), (2, 0.42 * bright), (3, 0.18 * bright), (4, 0.09 * bright), (5, 0.04 * bright)):
        fh = freq * h * np.sqrt(1 + B * h * h)
        s += a * np.sin(2 * np.pi * fh * tt + h) * np.exp(-tt * (0.9 + 0.55 * h) * (1 + freq / 1200))
    s += lp(rng.standard_normal(n), 900) * np.exp(-tt * 70) * 0.05   # felt
    rel = np.clip((dur + 1.5 - tt) / 1.5, 0, 1)
    return s * (1 - np.exp(-tt * 350)) * rel * amp


def pad(freq, dur, amp=1.0, attack=1.2, release=1.8, bright=1500):
    n = int((dur + release) * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.0035, 0.0, 0.004):
        ph = rng.uniform(0, 6.28)
        s += sum(np.sin(2 * np.pi * freq * (1 + det) * h * tt + ph * h) / h ** 1.6 for h in range(1, 7))
    s = lp(s, bright)
    return s * adsr(n, attack, 0.4, 0.9, release, dur - attack - 0.4) * amp / 3


def pluck(freq, amp=1.0, decay=4.0, dur=1.4):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * decay) + 0.28 * np.sin(2 * np.pi * freq * 2 * tt) * np.exp(-tt * decay * 2.2) + 0.1 * np.sin(2 * np.pi * freq * 3.01 * tt) * np.exp(-tt * decay * 3.5)
    return s * (1 - np.exp(-tt * 900)) * amp


def bell(freq, amp=1.0, dur=3.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 1.7) + 0.35 * np.sin(2 * np.pi * freq * 2.76 * tt) * np.exp(-tt * 4.5)
         + 0.18 * np.sin(2 * np.pi * freq * 5.4 * tt) * np.exp(-tt * 8) + 0.25 * np.sin(2 * np.pi * freq * 2 * tt) * np.exp(-tt * 3))
    return s * (1 - np.exp(-tt * 1200)) * amp


def bass(freq, dur, amp=1.0):
    n = int((dur + 0.4) * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * tt) + 0.25 * np.sin(2 * np.pi * freq * 2 * tt) * np.exp(-tt * 3)
    return s * adsr(n, 0.02, 0.3, 0.7, 0.35, dur - 0.35) * amp


MOTIF = (79, 84, 88)  # the Fentra sonic logo: G5 – C6 – E6


def motif(amp=1.0, octave=0, gap=0.17, dur=3.2):
    n = int((gap * 2 + dur) * SR); out = np.zeros(n)
    for i, m in enumerate(MOTIF):
        seg = bell(midi(m + 12 * octave), 1.0 if i < 2 else 1.15, dur)
        out[int(i * gap * SR):int(i * gap * SR) + len(seg)] += seg[:n - int(i * gap * SR)]
    return out * amp


def riser(dur, amp=1.0, f0=500, f1=7000):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    x = rng.standard_normal(n); out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** u[i]
        seg = x[max(0, i - 4096):i + blk]
        out[i:i + blk] = bp(seg, f * 0.7, min(f * 1.4, SR / 2 - 200))[-len(x[i:i + blk]):]
    return out * u ** 2 * amp


def shimmer(dur, amp=1.0, seed=0):
    """Fine glittering texture: many tiny high sine grains."""
    r = np.random.default_rng(seed)
    n = int(dur * SR); out = np.zeros(n)
    for _ in range(int(dur * 38)):
        f = r.uniform(3200, 9000); L = int(r.uniform(0.03, 0.09) * SR); i = int(r.uniform(0, n - L))
        tt = np.arange(L) / SR
        out[i:i + L] += np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / tt[-1]) ** 2 * r.uniform(0.3, 1)
    return out * amp


# ------------------------------------------------------------------ foley
def soft_step(seed=0, bright=1.0):
    r = np.random.default_rng(seed)
    n = int(0.16 * SR); tt = np.arange(n) / SR
    s = bp(r.standard_normal(n), 140, 1800 * bright) * np.exp(-tt * 75) + np.sin(2 * np.pi * (75 + 15 * r.random()) * tt) * np.exp(-tt * 50) * 0.35
    s += bp(r.standard_normal(n), 2000, 7000) * np.exp(-tt * 45) * 0.12
    i = int((0.012 + r.random() * 0.01) * SR)
    s[i:] += 0.5 * bp(r.standard_normal(n - i), 200, 2500) * np.exp(-tt[:n - i] * 110)
    return s / (np.max(np.abs(s)) + 1e-9)


def pass_by(dur, kind="car", seed=0):
    """A vehicle passing: returns (mono body, pan curve -1..1 over dur)."""
    r = np.random.default_rng(seed)
    n = int(dur * SR); u = np.linspace(-1, 1, n)
    prox = 1 / (1 + (u * 3.2) ** 2)
    if kind == "car":
        tyre = bp(r.standard_normal(n), 250, 2600) * 0.8 + lp(r.standard_normal(n), 180) * 2.0
        hum = np.sin(2 * np.pi * np.cumsum(62 + 6 * np.tanh(-u * 3)) / SR) * 0.25
        body = (tyre + hum) * prox
        body = lp(body, 1500) * 0.6 + body * 0.4 * prox
    else:
        f = 92 * (1 + 0.05 * np.tanh(-u * 3))
        ph = np.cumsum(f) / SR
        saw = 2 * (ph % 1) - 1
        buzz = bp(saw + 0.3 * np.sign(np.sin(2 * np.pi * ph * 2)), 120, 2400) * (1 + 0.15 * np.sin(2 * np.pi * 7 * np.arange(n) / SR))
        body = (buzz * 0.5 + bp(r.standard_normal(n), 400, 3000) * 0.3) * prox ** 1.2
    return body / (np.max(np.abs(body)) + 1e-9), u


def door_click(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.2 * SR); tt = np.arange(n) / SR; out = np.zeros(n)
    for off, g in ((0.0, 1.0), (0.06, 0.6)):
        i = int(off * SR); m = n - i
        out[i:] += (bp(r.standard_normal(m), 900, 5000) * np.exp(-tt[:m] * 260) + np.sin(2 * np.pi * 1400 * tt[:m]) * np.exp(-tt[:m] * 200) * 0.3) * g
    return out / np.max(np.abs(out))


def shop_bell(amp=1.0):
    n = int(2.2 * SR); out = np.zeros(n)
    for k, (off, f) in enumerate(((0.0, 2637), (0.11, 3136), (0.23, 2637), (0.36, 3136))):
        i = int(off * SR); tt = np.arange(n - i) / SR
        out[i:] += (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.4 * tt) * np.exp(-tt * 6)) * np.exp(-tt * 3.2) * (1 - 0.18 * k)
    return out / np.max(np.abs(out)) * amp


def fabric(dur=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR); u = np.linspace(0, 1, n)
    s = bp(r.standard_normal(n), 500, 4500) * np.sin(np.pi * u) ** 1.5 * (0.6 + 0.4 * np.abs(np.sin(u * 31)))
    return s / (np.max(np.abs(s)) + 1e-9)


def chirp(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.09 * SR); tt = np.arange(n) / SR; u = tt / tt[-1]
    f = r.uniform(3800, 5200) * (1 + 0.25 * np.sin(np.pi * u))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * u) ** 2


def murmur(dur, voices=8, seed=0):
    """Soft distant conversation: band-limited noise with syllabic envelopes, no intelligible content."""
    r = np.random.default_rng(seed)
    n = int(dur * SR); out = np.zeros((n, 2))
    for v in range(voices):
        f0 = r.uniform(170, 330)
        x = bp(r.standard_normal(n), f0 * 1.5, f0 * 7)
        syl = lp(np.abs(r.standard_normal(n)), r.uniform(3.5, 6.0))
        syl = np.clip(syl / (np.max(syl) + 1e-9) * 2.2 - 0.35, 0, 1)
        phrase = lp(np.abs(r.standard_normal(n)), 0.4); phrase = np.clip(phrase / (np.max(phrase) + 1e-9) * 2 - 0.4, 0, 1)
        out += pan(x * syl * phrase, r.uniform(-0.7, 0.7))
    return lp(out, 2200) / (np.max(np.abs(out)) + 1e-9)


# ------------------------------------------------------------------ build
def build():
    street_ir = ir(1.9, 6000, seed=2)
    fx = np.zeros((N, 2)); fx_send = np.zeros((N, 2))
    mus = np.zeros((N, 2)); mus_send = np.zeros((N, 2))

    # --- ambience: an afternoon street; thinner and airier as the camera rises into the sky
    white = rng.standard_normal((N, 2))
    brown = np.cumsum(white, axis=0); brown -= lp(brown, 0.5); brown /= np.max(np.abs(brown))
    city = lp(brown, 220) * 2.4 + bp(white, 300, 2600) * 0.01
    city *= (0.85 + 0.15 * np.sin(2 * np.pi * 0.06 * t + 1.3))[:, None]
    wind = bp(white, 150, 900) * (0.55 + 0.45 * lp(np.abs(rng.standard_normal((N, 2))), 0.35) * 6)
    city_lvl = env([(0, 0.0), (0.25, 1), (10.45, 1), (11.7, 0.55), (13.0, 0.5), (14.9, 0.8), (19.0, 0.85), (T["brand0"], 1.0), (T["brand0"] + 1.2, 0.25), (DUR, 0.15)])
    wind_lvl = env([(0, 0.25), (10.45, 0.25), (11.5, 1.0), (13.4, 1.0), (15.0, 0.3), (DUR, 0.2)])
    fx += city * city_lvl[:, None] * 0.085 + wind * wind_lvl[:, None] * 0.018
    # distant passes and street life under the whole bed
    for s0, L, d in ((0.6, 4.0, -1), (9.0, 5.0, 1), (19.5, 4.5, -1)):
        body, u = pass_by(L, "car", seed=int(s0 * 10))
        place(fx, s0, pan(lp(body, 700), 0) * np.stack([0.5 - 0.4 * u * d, 0.5 + 0.4 * u * d], axis=1), 0.03)
    # birds in the sky
    for k in range(9):
        x = 10.8 + k * 0.33 + rng.uniform(-0.1, 0.1)
        place(fx, x, pan(chirp(seed=k), rng.uniform(-0.5, 0.5)), 0.012); place(fx_send, x, pan(chirp(seed=k)), 0.015)

    # --- footsteps of the people on screen
    for k, (ft, p, g, who) in enumerate(CUES["steps"]):
        s = soft_step(seed=k, bright=1.0 + 0.3 * g)
        place(fx, ft, pan(s, p * 0.8), 0.16 * g); place(fx_send, ft, pan(s, p), 0.06 * g)

    # --- vehicles
    for v in CUES["vehicles"]:
        L = 4.4 if v["kind"] == "car" else 4.0
        body, u = pass_by(L, v["kind"], seed=3 if v["kind"] == "car" else 5)
        d = v["dir"]
        panc = np.clip(u * d * 1.1, -1, 1)
        a = (panc + 1) * np.pi / 4
        g = (0.2 if v["kind"] == "car" else 0.12) * np.clip(8.0 / max(v["dist"], 2), 0.3, 1.2)
        place(fx, v["t"] - L / 2, np.stack([body * np.cos(a), body * np.sin(a)], axis=1), g)
        place(fx_send, v["t"] - L / 2, np.stack([body * np.cos(a), body * np.sin(a)], axis=1), g * 0.3)

    # --- doors
    for x, which in CUES["doors"]:
        if which == "cafe":
            place(fx, x, pan(door_click(seed=int(x * 10)), -0.8), 0.035)
    hero = [x for x, w in CUES["doors"] if w == "hero"][0]; hero_close = [x for x, w in CUES["doors"] if w == "hero_close"][0]
    place(fx, hero + 0.02, pan(door_click(seed=4), 0.0), 0.05)
    place(fx, hero + 0.06, pan(shop_bell(), 0.0), 0.05); place(fx_send, hero + 0.06, pan(shop_bell()), 0.08)
    place(fx, hero_close, pan(door_click(seed=5), 0.0), 0.035)

    # --- the Fentra signal: a small sonic lift, a descending glide, a drawn shimmer as it traces the shop
    sig = T["sigOn"]; desc = T["desc0"]; touch = T["touch"]
    for i, m in enumerate(MOTIF):
        b = bell(midi(m + 12), 0.045, 3.5)
        place(mus, sig + 0.15 + i * 0.2, pan(b, 0.1)); place(mus_send, sig + 0.15 + i * 0.2, pan(b), 0.9)
    sw = shimmer(touch - sig + 0.6, 0.02, seed=1) * np.linspace(0.3, 1, int((touch - sig + 0.6) * SR))
    place(mus, sig, pan(sw, 0.05)); place(mus_send, sig, pan(sw), 0.8)
    r = riser(touch - desc, 0.045, 1200, 5200)[::-1] * np.linspace(0.6, 1, int((touch - desc) * SR))  # descending air
    place(mus, desc, pan(r, 0)); place(mus_send, desc, pan(r), 0.6)
    tr = shimmer(T["trace1"] - touch + 0.4, 0.03, seed=2)
    L_ = len(tr); a = np.linspace(0, 1, L_)
    place(mus, touch, np.stack([tr * (1 - 0.5 * a), tr * (0.5 + 0.5 * a)], axis=1)); place(mus_send, touch, pan(tr), 0.9)
    # awning unfolds
    place(fx, T["awn0"], pan(fabric(T["awn1"] - T["awn0"] + 0.2, seed=3), 0.0), 0.02)

    # ================================================================== music
    # Part 1 — calm, reflective (F major, felt piano and a low pad): Dm9 · B♭maj7 · F/A · Gm7(sus)
    chords1 = [(0.35, (38, 50, 57, 60, 64)), (2.85, (34, 50, 53, 57, 62)), (5.35, (33, 48, 53, 57, 60)), (7.85, (31, 46, 50, 53, 60))]
    for x, notes in chords1:
        for j, n in enumerate(notes):
            s = piano(midi(n), 2.6, 0.05 if j else 0.06, bright=0.8)
            place(mus, x + j * 0.035, pan(s, (j - 2) * 0.1)); place(mus_send, x + j * 0.035, pan(s), 0.35)
        s = pad(midi(notes[0] + 12), 2.5, 0.05, attack=0.8, release=1.4, bright=900)
        place(mus, x, pan(s, 0)); place(mus_send, x, pan(s), 0.4)
    # a sparse melody on top
    for x, n in ((1.6, 72), (2.2, 69), (4.1, 70), (4.7, 69), (6.6, 72), (7.2, 74), (8.4, 72)):
        s = piano(midi(n), 1.6, 0.035, bright=0.9)
        place(mus, x, pan(s, 0.15)); place(mus_send, x, pan(s), 0.5)
    # "…sizi seçemez." — the music holds its breath (one low note); then the lift begins with the crane
    s = pad(midi(29), 1.9, 0.05, attack=0.2, release=1.0, bright=500); place(mus, 9.0, pan(s, 0)); place(mus_send, 9.0, pan(s), 0.3)
    for x, notes, dur in ((10.45, (34, 46, 53, 57, 62, 65), 2.0), (12.35, (36, 48, 53, 55, 60, 65), 2.6)):
        for j, n in enumerate(notes):
            s = pad(midi(n), dur, 0.034, attack=1.1, release=1.6, bright=1900)
            place(mus, x, pan(s, (j - 2.5) * 0.12)); place(mus_send, x, pan(s), 0.6)
    for k, n in enumerate((65, 69, 72, 74, 77)):  # rising arpeggio as the camera climbs
        s = piano(midi(n), 1.8, 0.03, bright=1.0); place(mus, 10.55 + k * 0.34, pan(s, 0.2)); place(mus_send, 10.55 + k * 0.34, pan(s), 0.6)

    # Part 2 — warm and uplifting (96 bpm), from the touch: F · C/E · Dm7 · B♭maj7 · F/A · Am7 · B♭maj9 · C6 · Fadd9
    beat = 60 / 96
    t0 = touch
    prog = [(41, (53, 57, 60, 64)), (40, (52, 55, 60, 67)), (38, (53, 57, 60, 62)), (34, (50, 53, 57, 62)),
            (45, (53, 57, 60, 65)), (45, (52, 55, 60, 64)), (46, (53, 57, 60, 62)), (48, (52, 55, 57, 64)), (41, (53, 57, 60, 67))]
    lights = T["lights0"]
    for i, (b, ch) in enumerate(prog):
        x = t0 + i * 2 * beat
        if x > T["brand0"] - 0.1: break
        g = 0.7 + 0.3 * float(np.clip((x - lights) / 2, 0, 1))
        for j, n in enumerate(ch):
            s = pad(midi(n), 2 * beat * 0.95, 0.03 * g, attack=0.35 if i else 0.8, release=0.9, bright=1600 + 1400 * g)
            place(mus, x, pan(s, (j - 1.5) * 0.18)); place(mus_send, x, pan(s), 0.5)
        s = bass(midi(b), 2 * beat * 0.9, 0.07 * g); place(mus, x, pan(s, 0))
        # plucked eighth-note arpeggio, entering once the shop has its outline
        if x >= t0 + 2 * beat - 0.01:
            arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12]
            for e in range(4):
                n = arp[(e * 2 + i) % 4]
                s = pluck(midi(n), 0.022 * g, decay=5.5)
                place(mus, x + e * beat / 2, pan(s, 0.25 if e % 2 else -0.25)); place(mus_send, x + e * beat / 2, pan(s), 0.45)
    # the sign resolves letter by letter (7 soft notes, from the centre out)
    letters = (72, 74, 76, 79, 81, 84, 86, 88, 91, 93)  # İŞLETMENİZ: one soft note per letter, centre outward
    for k, n in enumerate(letters):
        x = T["sign0"] + 0.1 + k * (T["sign1"] - T["sign0"] - 0.2) / len(letters)
        s = pluck(midi(n + 12), 0.011, decay=7, dur=1.0); place(mus, x, pan(s, (k - 4.5) * 0.09)); place(mus_send, x, pan(s), 0.8)
    # lights on: a warm swell
    for n in (41, 48, 57, 60, 64, 69):
        s = pad(midi(n), 3.2, 0.028, attack=0.6, release=2.0, bright=2600)
        place(mus, lights - 0.2, pan(s, 0)); place(mus_send, lights - 0.2, pan(s), 0.7)
    # gentle shaker once people arrive
    for i in range(int((T["brand0"] - 19.0) / (beat / 2))):
        x = 19.0 + 0.02 + i * beat / 2
        n = int(0.07 * SR); tt = np.arange(n) / SR
        s = hp(rng.standard_normal(n), 6000) * np.exp(-tt * 55) * (1.0 if i % 2 else 0.55)
        place(mus, x, pan(s, 0.35), 0.006 * min(1, (x - 19.0) / 2))

    # --- crowd murmur: rises with the queue, recedes into the brand frame
    mm = murmur(T["brand0"] - 18.6 + 3.0, voices=9, seed=3)
    mlev = np.interp(np.arange(len(mm)) / SR + 18.6, [18.6, 20.0, 22.5, T["brand0"], T["brand0"] + 1.7, T["brand0"] + 3.2], [0.0, 0.25, 0.8, 1.0, 0.25, 0.0])
    place(fx, 18.6, mm * mlev[:, None], 0.028); place(fx_send, 18.6, mm * mlev[:, None], 0.01)

    # Brand — resolution (F add9) and the full Fentra motif as the logo appears
    BT = T["brand0"]
    for n in (29, 41, 48, 55, 57, 60, 67):
        s = pad(midi(n), DUR - BT - 0.2, 0.034 if n > 40 else 0.05, attack=1.0, release=1.6, bright=2200)
        place(mus, BT - 0.1, pan(s, 0)); place(mus_send, BT - 0.1, pan(s), 0.5)
    m = motif(0.06, octave=0, gap=0.17, dur=3.2)
    place(mus, T["logo"], pan(m, 0)); place(mus_send, T["logo"], pan(m, 0), 1.0)
    s = piano(midi(65), 2.5, 0.03); place(mus, T["slogan"] + 0.05, pan(s, -0.1)); place(mus_send, T["slogan"] + 0.05, pan(s), 0.6)

    # ================================================================== voice-over (optional recordings)
    vo = np.zeros((N, 2)); have_vo = False
    vo_times = [5.6, 9.0, 20.8, T["slogan"]]
    spans = []
    for i, v0 in enumerate(vo_times):
        f = ROOT / "assets" / "vo" / f"line{i + 1}.wav"
        if not f.exists():
            continue
        sr, d = wavfile.read(f)
        d = d.astype(np.float32); d /= (np.max(np.abs(d)) + 1e-9)
        if d.ndim > 1: d = d.mean(axis=1)
        if sr != SR: d = resample_poly(d, SR, sr)
        place(vo, v0, pan(d, 0), 0.5); have_vo = True; spans.append((v0, v0 + len(d) / SR))
    duck = np.ones(N)
    for a, b in spans:
        duck = np.minimum(duck, 1 - 0.45 * win(t, a - 0.3, a, b, b + 0.5))

    # ================================================================== mix
    fxw = verb(fx_send, street_ir, 0.45)
    musw = verb(mus_send, ir(2.8, 5200, seed=4), 0.55)
    music = (mus + musw) * duck[:, None]
    mix = (fx + fxw) * duck[:, None] ** 0.5 + music * 1.0 + vo
    mix = hp(mix, 28)
    mix *= env([(0, 0), (0.12, 1), (DUR - 0.9, 1), (DUR, 0)])[:, None]
    mix = np.tanh(mix * 1.3) / 1.3
    mix *= 10 ** (-1.0 / 20) / (np.max(np.abs(mix)) + 1e-9)
    return mix.astype(np.float32), have_vo


if __name__ == "__main__":
    audio, have_vo = build()
    wavfile.write(OUT / "_audio.wav", SR, audio)
    rms = 20 * np.log10(np.sqrt(np.mean(audio ** 2)) + 1e-12)
    print(f"wrote {OUT / '_audio.wav'}  {len(audio) / SR:.2f}s  rms {rms:.1f} dBFS  voice-over: {'yes' if have_vo else 'no (captions only)'}")
