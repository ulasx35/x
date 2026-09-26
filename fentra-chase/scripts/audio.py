"""Sound design + score for the Fentra film -> output/_audio.wav

Everything is synthesized here and synced to output/cues.json (exported from the animation):
night city ambience, leather footsteps on wet stone, the pursuers' steps, breathing, coat rustle,
flashlight clicks, a restrained suspense score that drops out at the dead end, a curious reveal,
a warm office theme, one notification chime, a tiny wink accent and the brand resolution.
If recorded voice-over files exist (assets/vo/line1.wav … line5.wav) they are mixed in at the
narration timecodes, with the music ducked underneath.
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
CUES = json.loads((OUT / "cues.json").read_text())
SR = 48000
DUR = float(CUES["duration"])
N = int(round(SR * DUR))
t = np.arange(N) / SR
rng = np.random.default_rng(7)


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
    a = (p + 1) * np.pi / 4
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


def shot_gain(points):
    """piecewise-constant gain by time: [(t0, g), ...]"""
    def g(x):
        v = points[0][1]
        for t0, gv in points:
            if x >= t0: v = gv
        return v
    return g


# ------------------------------------------------------------------ foley
def footstep(gain=1.0, wet=1.0, bright=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.22 * SR); tt = np.arange(n) / SR
    out = np.zeros(n)
    for k, off in enumerate((0.0, 0.016 + r.random() * 0.006)):  # heel then sole
        i = int(off * SR); m = n - i
        tm = tt[:m]
        click = bp(r.standard_normal(m), 250, 3800 * bright) * np.exp(-tm * (140 if k == 0 else 190)) * (1.0 if k == 0 else 0.6)
        thump = np.sin(2 * np.pi * (85 + 20 * r.random()) * tm) * np.exp(-tm * 55) * 0.5
        out[i:] += click + thump
    splash = bp(r.standard_normal(n), 1800, 9000) * np.exp(-tt * (22 + 10 * r.random())) * (1 - np.exp(-tt * 300)) * 0.35 * wet
    out += splash
    return out * gain / (np.max(np.abs(out)) + 1e-9)


def soft_step(gain=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(0.16 * SR); tt = np.arange(n) / SR
    s = bp(r.standard_normal(n), 120, 1600) * np.exp(-tt * 70) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 45) * 0.4
    s += bp(r.standard_normal(n), 1500, 7000) * np.exp(-tt * 30) * 0.18
    return s * gain / (np.max(np.abs(s)) + 1e-9)


def breath(kind="out", length=0.32, gain=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(length * SR); tt = np.arange(n) / SR; u = tt / length
    noise = r.standard_normal(n)
    if kind == "out":
        s = bp(noise, 400, 2600) + 0.6 * bp(noise, 650, 900) + 0.4 * bp(noise, 1150, 1500)
        e = np.sin(np.pi * np.clip(u * 1.3, 0, 1)) ** 0.8 * np.exp(-u * 1.2)
    else:
        s = bp(noise, 900, 4200) + 0.5 * bp(noise, 1700, 2300)
        e = np.sin(np.pi * u) ** 1.4 * 0.65
    s = s * e
    return s * gain / (np.max(np.abs(s)) + 1e-9)


def rustle(length=0.3, gain=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = int(length * SR); u = np.linspace(0, 1, n)
    s = bp(r.standard_normal(n), 600, 5000) * np.sin(np.pi * u) ** 2 * (0.6 + 0.4 * np.abs(np.sin(u * 23)))
    return s * gain / (np.max(np.abs(s)) + 1e-9)


def torch_click(seed=0):
    r = np.random.default_rng(seed)
    n = int(0.11 * SR); out = np.zeros(n); tt = np.arange(n) / SR
    for off, g in ((0.0, 1.0), (0.048, 0.55)):  # press, release
        i = int(off * SR); m = n - i; tm = tt[:m]
        out[i:] += (bp(r.standard_normal(m), 2200, 7500) * np.exp(-tm * 900) + np.sin(2 * np.pi * 3300 * tm) * np.exp(-tm * 420) * 0.45) * g
    return out / np.max(np.abs(out))


def flutter(dur=0.7, seed=0):
    r = np.random.default_rng(seed)
    n = int(dur * SR); tt = np.arange(n) / SR
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (9 + r.random() * 2) * tt)) * np.abs(np.sin(2 * np.pi * (9 + r.random() * 2) * tt)) ** 0.3
    s = bp(r.standard_normal(n), 700, 4200) * am * np.exp(-tt * 2.2) * (1 - np.exp(-tt * 60))
    return s / (np.max(np.abs(s)) + 1e-9)


def drip(freq=1900, amp=1.0):
    n = int(0.25 * SR); tt = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-tt * 60))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)
    return s * amp


MOTIF = (79, 84, 88)  # the Fentra sonic logo: G5 – C6 – E6, rising (sits as Fmaj9 colour over F)


def motif(amp=1.0, octave=0, gap=0.17, dur=3.2):
    n = int((gap * 2 + dur) * SR); out = np.zeros(n)
    for i, m in enumerate(MOTIF):
        f = midi(m + 12 * octave)
        tt = np.arange(n - int(i * gap * SR)) / SR
        tone = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.6) + 0.32 * np.sin(2 * np.pi * f * 2.0 * tt) * np.exp(-tt * 3.5)
                + 0.12 * np.sin(2 * np.pi * f * 3.01 * tt) * np.exp(-tt * 6) + 0.2 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt * 9))
        out[int(i * gap * SR):] += tone * (1 - np.exp(-tt * 900)) * (1.0 if i < 2 else 1.15)
    return out * amp


def gasp():
    n = int(0.42 * SR); tt = np.arange(n) / SR; u = tt / tt[-1]
    s = bp(rng.standard_normal(n), 900, 4200) * (np.clip(u * 5, 0, 1) * np.exp(-u * 3.2))
    return s / np.max(np.abs(s))


# ------------------------------------------------------------------ instruments
def bowed(freq, dur, amp=1.0, attack=0.4, release=0.8, bright=1800, vib=0.004):
    n = int((dur + release) * SR); tt = np.arange(n) / SR
    ph = 2 * np.pi * freq * tt * (1 + vib * np.sin(2 * np.pi * 5.2 * tt))
    s = sum(np.sin(ph * h + h) / h ** 1.1 for h in range(1, 12))
    s = lp(s, bright)
    e = adsr(n, attack, 0.2, 0.85, release, dur - attack - 0.2)
    return s * e * amp


def stacc(freq, amp=1.0, dur=0.16, bright=1400):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * freq * h * tt) / h for h in range(1, 10))
    s = lp(s, bright) * np.exp(-tt * 18) * (1 - np.exp(-tt * 400))
    return s * amp


def pluck(freq, amp=1.0, decay=3.0, dur=1.6):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * decay) + 0.3 * np.sin(2 * np.pi * freq * 3.01 * tt) * np.exp(-tt * decay * 2.5)
    return s * (1 - np.exp(-tt * 800)) * amp


def celesta(freq, amp=1.0, dur=2.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 2.2) + 0.35 * np.sin(2 * np.pi * freq * 4 * tt) * np.exp(-tt * 7) + 0.12 * np.sin(2 * np.pi * freq * 6.8 * tt) * np.exp(-tt * 11)
    return s * (1 - np.exp(-tt * 900)) * amp


def rhodes(freq, dur, amp=1.0):
    n = int((dur + 1.2) * SR); tt = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 14 * tt) * 1.3 * np.exp(-tt * 6)
    s = np.sin(2 * np.pi * freq * tt + mod) + 0.25 * np.sin(2 * np.pi * freq * 2 * tt) * np.exp(-tt * 1.5)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 4.6 * tt)
    e = np.exp(-tt * 0.9) * (1 - np.exp(-tt * 300)) * np.clip((dur + 1.2 - tt) / 1.2, 0, 1)
    return s * e * trem * amp


def pad(freq, dur, amp=1.0, attack=1.2, release=1.8, bright=1500):
    n = int((dur + release) * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        ph = rng.uniform(0, 6.28)
        s += sum(np.sin(2 * np.pi * freq * (1 + det) * h * tt + ph * h) / h ** 1.5 for h in range(1, 8))
    s = lp(s, bright)
    return s * adsr(n, attack, 0.4, 0.9, release, dur - attack - 0.4) * amp / 3


def boom(amp=1.0):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    f = 48 * (1 + 1.2 * np.exp(-tt * 9))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2) + lp(rng.standard_normal(n), 300) * np.exp(-tt * 9) * 0.3
    return s * amp


def chime(f1, f2, amp=1.0):
    n = int(1.4 * SR); tt = np.arange(n) / SR
    a = np.sin(2 * np.pi * f1 * tt) * np.exp(-tt * 7) + 0.3 * np.sin(2 * np.pi * f1 * 2 * tt) * np.exp(-tt * 12)
    i = int(0.085 * SR)
    b = np.zeros(n); tb = tt[:n - i]
    b[i:] = np.sin(2 * np.pi * f2 * tb) * np.exp(-tb * 5) + 0.3 * np.sin(2 * np.pi * f2 * 2 * tb) * np.exp(-tb * 10)
    return (a * 0.8 + b) * (1 - np.exp(-tt * 1500)) * amp


def riser(dur, amp=1.0):
    n = int(dur * SR); u = np.linspace(0, 1, n)
    x = rng.standard_normal(n); out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        f = 400 * (9000 / 400) ** u[i]
        seg = x[max(0, i - 4096):i + blk]
        out[i:i + blk] = bp(seg, f * 0.6, min(f * 1.5, SR / 2 - 200))[-len(x[i:i + blk]):]
    return out * u ** 2.5 * amp


# ------------------------------------------------------------------ build
def build():
    street_ir, office_ir = ir(2.6, 5200, seed=2), ir(0.7, 7000, seed=3)
    fx = np.zeros((N, 2)); fx_send = np.zeros((N, 2))
    mus = np.zeros((N, 2)); mus_send = np.zeros((N, 2))
    stop = CUES["stop"]

    # --- ambience: night city → narrow alley → office room tone
    white = rng.standard_normal((N, 2))
    brown = np.cumsum(white, axis=0); brown -= lp(brown, 0.5); brown /= np.max(np.abs(brown))
    city = lp(brown, 180) * 2.2 + bp(white, 300, 2400) * 0.012
    city *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t + 1.0))[:, None]
    for s0, L, d in ((2.5, 5.0, 1), (14.0, 4.0, -1), (33.0, 5.0, 1), (47.0, 5.5, -1)):
        n = int(L * SR); u = np.linspace(0, 1, n)
        body = bp(rng.standard_normal(n), 150, 1100) * np.sin(np.pi * u) ** 2.5
        a = (d * (u * 1.6 - 0.8) + 1) * np.pi / 4
        place(city, s0, np.stack([body * np.cos(a), body * np.sin(a)], axis=1) * 0.08)
    OUT_T = CUES.get("outside", 84.5)
    city_lvl = env([(0, 0.6), (0.2, 1), (22, 1), (22.4, 0.7), (60.6, 0.7), (62.6, 0.2), (63.4, 0.0), (OUT_T - 0.05, 0.0), (OUT_T, 0.9), (DUR, 0.7)])
    fx += city * city_lvl[:, None] * 0.09
    room = lp(rng.standard_normal((N, 2)), 400) * 0.02 + lp(brown, 120) * 0.25
    fx += room * env([(0, 0), (63.4, 0), (64.2, 1), (OUT_T - 0.05, 1), (OUT_T, 0), (DUR, 0)])[:, None] * 0.08
    # rain: fine patter + a softer wash; muffled behind the office glass
    wn = rng.standard_normal((N, 2))
    patter = hp(wn, 3500) * (0.6 + 0.4 * np.abs(lp(rng.standard_normal((N, 2)), 30)))
    wash = bp(wn, 600, 2600) * 0.5
    rain_bed = patter * 0.022 + wash * 0.012
    rain_lvl = env([(0, 1), (22.2, 1), (22.4, 0.85), (60.6, 0.85), (62.4, 0.2), (63.4, 0.0), (OUT_T - 0.05, 0.0), (OUT_T, 1.0), (DUR, 0.85)])
    fx += rain_bed * rain_lvl[:, None]
    fx += lp(rain_bed, 1300) * env([(0, 0), (63.4, 0), (64.0, 0.55), (OUT_T - 0.05, 0.55), (OUT_T, 0), (DUR, 0)])[:, None]
    for k in range(260):  # individual drips from eaves and awnings
        x = rng.uniform(0.2, DUR - 0.5)
        if 63.4 < x < OUT_T: continue
        place(fx, x, pan(drip(rng.uniform(1300, 2600), 1), rng.uniform(-0.8, 0.8)), 0.012 * rng.uniform(0.4, 1))
    # cold open: an intimate breath, a drop falling from the brim
    for x, g in ((0.05, 0.16), (0.72, 0.18)):
        place(fx, x, pan(breath("out", 0.6, seed=int(x * 100)), 0.05), g); place(fx_send, x, pan(breath("out", 0.6, seed=int(x * 100))), g * 0.3)
    place(fx, 0.92, pan(drip(2100, 1), -0.2), 0.12); place(fx_send, 0.92, pan(drip(2100, 1), -0.2), 0.2)
    # pigeons bursting into the air
    for k, x in enumerate(CUES.get("pigeons", [])):
        fl = flutter(0.75, seed=40 + k)
        place(fx, x, pan(fl, rng.uniform(-0.7, 0.7)), 0.06); place(fx_send, x, pan(fl), 0.05)

    # --- his footsteps (level follows the shot: distance / close-up)
    g_run = shot_gain([(0, 0.55), (2.6, 0.4), (4.4, 0.22), (7.0, 1.0), (8.6, 0.72), (11.6, 0.6), (17.2, 0.28), (18.75, 0.7), (19.95, 0.0)])
    for k, ft in enumerate(CUES["run"]):
        g = g_run(ft)
        if ft < 4.4 and ft > 1.25: g *= max(0.3, 1 - (ft - 1.25) / 4.0)
        s = footstep(1.0, wet=1.0, bright=1.0 + (0.3 if 7.0 <= ft < 8.6 else 0), seed=k)
        place(fx, ft, pan(s, 0.05), 0.5 * g); place(fx_send, ft, pan(s), 0.2 * g)
    for k, ft in enumerate(CUES["decel"] + [stop - 0.25, stop]):
        s = footstep(1.0, wet=0.8, seed=200 + k)
        g = 0.55 * (0.6 if ft > stop - 0.3 else 1)
        place(fx, ft, pan(s, 0), 0.5 * g); place(fx_send, ft, pan(s), 0.3 * g)
    # the pursuers
    g_grp = shot_gain([(0, 0.0), (4.4, 0.4), (7.0, 0.0), (13.2, 0.75), (15.4, 0.5), (17.2, 0.28), (19.95, 0.45), (22.2, 0.0)])
    for k, ft in enumerate(CUES["group"]):
        g = g_grp(ft)
        if g <= 0: continue
        s = soft_step(1.0, seed=500 + k)
        p = rng.uniform(-0.5, 0.5)
        place(fx, ft, pan(s, p), 0.26 * g); place(fx_send, ft, pan(s, p), 0.18 * g)
    for k, ft in enumerate(CUES["arrive"]):
        s = soft_step(1.0, seed=900 + k)
        place(fx, ft, pan(s, rng.uniform(-0.3, 0.3)), 0.09); place(fx_send, ft, pan(s), 0.12)

    # --- breathing
    def breaths(t0, t1, rate, gain, seed0):
        k = 0; x = t0
        while x < t1:
            j = rng.uniform(-0.03, 0.03)
            place(fx, x + j, pan(breath("in", 0.26 / max(1, rate * 0.6), seed=seed0 + k), 0.0), gain * 0.55)
            place(fx, x + j + 0.5 / rate, pan(breath("out", 0.34 / max(1, rate * 0.55), seed=seed0 + k + 1), 0.0), gain)
            x += 1 / rate; k += 2
    breaths(1.4, 4.4, 1.7, 0.05, 10)
    breaths(7.0, 13.2, 1.8, 0.11, 30)
    breaths(13.2, 22.2, 1.9, 0.04, 60)
    breaths(22.2, stop, 2.0, 0.12, 90)
    # heavy, slowing breaths at the dead end — the only sound for a moment
    x = stop + 0.05; k = 0
    while x < 38.2:
        rate = np.interp(x, [stop, 29, 34, 38], [1.2, 0.9, 0.78, 0.9])
        gain = np.interp(x, [stop, 28, 31, 38], [0.2, 0.17, 0.1, 0.08])
        place(fx, x, pan(breath("in", 0.42, seed=300 + k), 0), gain * 0.6); place(fx_send, x, pan(breath("in", 0.42, seed=300 + k)), gain * 0.2)
        place(fx, x + 0.48 / rate, pan(breath("out", 0.55, seed=301 + k), 0), gain); place(fx_send, x + 0.48 / rate, pan(breath("out", 0.55, seed=301 + k)), gain * 0.3)
        x += 1 / rate; k += 2
    place(fx, 38.45, pan(gasp(), 0), 0.14); place(fx_send, 38.45, pan(gasp()), 0.08)
    breaths(39.6, 43.6, 2.6, 0.035, 700)
    place(fx, 54.55, pan(breath("out", 0.9, seed=777), 0), 0.07)            # the penny drops: a quiet exhale
    place(fx, 75.3, pan(breath("out", 0.5, seed=778), 0), 0.03)             # a content breath at the desk

    # --- coat
    for k, x in enumerate(np.arange(8.62, 11.6, RUN_T / 2)):
        place(fx, x, pan(rustle(0.22, seed=1000 + k), 0.1), 0.02)
    place(fx, 38.95, pan(rustle(0.8, seed=1), 0), 0.07)
    place(fx, 51.2, pan(rustle(1.1, seed=2), 0), 0.05)
    place(fx, 63.0, pan(rustle(0.01, seed=3), 0), 0.0)

    # --- flashlight clicks (tactile, dry-ish)
    for k, c in enumerate(CUES["clicks"]):
        s = torch_click(seed=k)
        p = [0.35, 0.15, -0.05, -0.2, -0.38][k]
        place(fx, c, pan(s, p), 0.3); place(fx_send, c, pan(s, p), 0.16)

    # --- office: notification chime, wink accent
    for k, nt in enumerate(CUES["notify"]):
        place(fx, nt, pan(chime(midi(MOTIF[0] + 12), midi(MOTIF[1] + 12), 0.12), 0.1)); place(fx_send, nt, pan(chime(midi(MOTIF[0] + 12), midi(MOTIF[1] + 12), 0.12)), 0.5)

    # ================================================================== music
    beat = 60 / 132 / 2  # eighth notes
    # suspense: low drone + staccato ostinato that tightens, then drops out at the dead end
    drone_end = stop
    for f, a in ((midi(38), 0.05), (midi(45), 0.035), (midi(26), 0.05)):
        s = bowed(f, drone_end - 1.2, a, attack=2.5, release=0.25, bright=700)
        place(mus, 1.2, pan(s, 0)); place(mus_send, 1.2, pan(s), 0.4)
    pattern = [38, 38, 41, 38, 40, 38, 36, 38]
    k = 0; x = 1.25
    while x < stop - 0.1:
        n = pattern[k % 8]
        a = 0.05 * np.interp(x, [1.25, 8.6, 17.2, 22.2, stop], [0.6, 0.9, 1.15, 1.3, 1.0])
        if k % 8 == 0: a *= 1.25
        place(mus, x, pan(stacc(midi(n), a), -0.15)); place(mus_send, x, pan(stacc(midi(n), a)), 0.3)
        if x > 8.6: place(mus, x, pan(stacc(midi(n + 12), a * 0.45, bright=2400), 0.2))
        x += beat; k += 1
    for f in (midi(69), midi(70)):  # high tremolo cluster rising from the shadows shot
        s = bowed(f, 8.6, 0.018, attack=4.0, release=0.4, bright=5000, vib=0.012) * (1 + 0.5 * np.sin(2 * np.pi * 13 * np.arange(int((8.6 + 0.4) * SR)) / SR))
        place(mus, 13.2, pan(s, 0.3)); place(mus_send, 13.2, pan(s), 0.6)
    for ct in CUES.get("cuts", []):  # a restrained low accent on each chase cut
        if 1.2 < ct < 22.3:
            place(mus, ct, pan(boom(0.045), 0)); place(mus_send, ct, pan(boom(0.045)), 0.2)
    for bt in (17.2, 22.2):
        place(mus, bt, pan(boom(0.16), 0)); place(mus_send, bt, pan(boom(0.16)), 0.3)
    # the silhouettes: soft low pulses as each one appears
    for k, a in enumerate(CUES["appear"]):
        place(mus, a, pan(boom(0.07 + k * 0.012), 0)); place(mus_send, a, pan(boom(0.07)), 0.4)
    for f, a in ((midi(37), 0.018), (midi(38), 0.018)):  # held tension under the arrival
        s = bowed(f, 7.8, a, attack=2.5, release=1.0, bright=600)
        place(mus, 30.4, pan(s, 0)); place(mus_send, 30.4, pan(s), 0.5)
    # beams on him: a string cluster swells; two restrained pizzicato notes when he hides
    for f in (midi(62), midi(63), midi(69)):
        s = bowed(f, 4.6, 0.02, attack=1.2, release=1.4, bright=3000, vib=0.006)
        place(mus, 38.2, pan(s, 0.1)); place(mus_send, 38.2, pan(s), 0.6)
    for x, n in ((39.15, 74), (39.5, 71), (42.1, 76), (42.85, 74)):
        place(mus, x, pan(pluck(midi(n), 0.05, decay=9, dur=0.6), 0.2)); place(mus_send, x, pan(pluck(midi(n), 0.05, decay=9, dur=0.6)), 0.5)
    # reveal: curiosity — a suspended pad and a rising celesta note for each person
    for f in (midi(50), midi(57), midi(64), midi(69)):
        s = pad(f, 7.0, 0.05, attack=1.5, release=2.0, bright=1600)
        place(mus, 43.9, pan(s, 0)); place(mus_send, 43.9, pan(s), 0.5)
    for x, n in zip((44.3, 45.75, 47.2, 48.65, 50.1), (69, 72, 74, 76, 79)):
        place(mus, x, pan(celesta(midi(n), 0.05), 0.15)); place(mus_send, x, pan(celesta(midi(n), 0.05)), 0.8)
    # under the first narration: warm, gentle (Bbmaj7 → F/A → Gm9 → Dsus4)
    for (x, dur, notes) in ((51.0, 3.0, (46, 53, 57, 62)), (53.8, 3.0, (45, 53, 57, 60)), (56.6, 2.4, (43, 50, 57, 58, 62)), (58.8, 2.3, (38, 50, 55, 57))):
        for n in notes:
            s = pad(midi(n), dur, 0.045, attack=1.0, release=1.8, bright=1700)
            place(mus, x, pan(s, 0)); place(mus_send, x, pan(s), 0.5)
    # into the light
    r = riser(2.3, 0.05)
    place(mus, 60.6, pan(r, 0)); place(mus_send, 60.6, pan(r), 0.6)
    for n in (62, 66, 69, 74):
        s = pad(midi(n), 1.6, 0.04, attack=1.4, release=1.8, bright=4000)
        place(mus, 61.4, pan(s, 0)); place(mus_send, 61.4, pan(s), 0.8)
    # office: warm electric piano, soft bass (F major, 80 bpm, a chord per bar)
    bar = 3.0
    prog = [(41, (53, 57, 60, 64, 67)), (45, (52, 55, 60, 64)), (38, (53, 57, 60, 64)), (46, (53, 57, 62, 64)), (43, (53, 58, 62, 65)), (48, (52, 55, 58, 62, 64)), (41, (53, 57, 60, 64, 67))]
    x = 63.6
    for i, (b, ch) in enumerate(prog):
        if x > 84.6: break
        for j, n in enumerate(ch):
            s = rhodes(midi(n), bar * 0.9, 0.038)
            place(mus, x + j * 0.018, pan(s, (j - 2) * 0.12)); place(mus_send, x + j * 0.018, pan(s), 0.25)
        s = pad(midi(b), bar * 0.95, 0.09, attack=0.3, release=0.8, bright=400)
        place(mus, x, pan(s, 0))
        x += bar
    # wink: one tiny glockenspiel note
    w = celesta(midi(96), 0.045, dur=1.6)
    place(mus, CUES["wink"], pan(w, 0.25)); place(mus_send, CUES["wink"], pan(w, 0.25), 1.2)
    # outside: the camera rises, warm swell; the lights spread with the motif, high and soft
    for n in (41, 48, 52, 57):
        s = pad(midi(n), 5.4, 0.04, attack=2.2, release=1.5, bright=1600)
        place(mus, OUT_T + 0.2, pan(s, 0)); place(mus_send, OUT_T + 0.2, pan(s), 0.5)
    m = motif(0.035, octave=1, gap=0.28, dur=4.0)
    place(mus, CUES.get("wave", OUT_T + 2.9), pan(m, 0.2)); place(mus_send, CUES.get("wave", OUT_T + 2.9), pan(m, 0.2), 1.4)
    # brand: clean, confident resolution (F add9) and the full sonic logo as the logo appears
    BT = CUES.get("brand", OUT_T + 6.2)
    for n in (29, 41, 48, 55, 57, 60, 67):
        s = pad(midi(n), DUR - BT - 0.4, 0.05 if n > 40 else 0.07, attack=1.0, release=1.8, bright=2200)
        place(mus, BT - 0.3, pan(s, 0)); place(mus_send, BT - 0.3, pan(s), 0.5)
    LT = CUES.get("logo", BT + 0.8)
    m = motif(0.075, octave=0, gap=0.17, dur=4.5)
    place(mus, LT, pan(m, 0)); place(mus_send, LT, pan(m, 0), 1.1)

    # ================================================================== voice-over (optional recordings)
    vo = np.zeros((N, 2)); have_vo = False
    for i, v in enumerate(CUES["vo"]):
        f = ROOT / "assets" / "vo" / f"line{i + 1}.wav"
        if not f.exists():
            continue
        sr, d = wavfile.read(f)
        d = d.astype(np.float32); d /= (np.max(np.abs(d)) + 1e-9)
        if d.ndim > 1: d = d.mean(axis=1)
        if sr != SR: d = resample_poly(d, SR, sr)
        place(vo, v["t0"], pan(d, 0), 0.5); have_vo = True
    duck = np.ones(N)
    for v in (CUES["vo"] if have_vo else []):
        duck = np.minimum(duck, 1 - 0.45 * win(t, v["t0"] - 0.3, v["t0"], v["t1"], v["t1"] + 0.5))

    # ================================================================== mix
    office = env([(0, 0), (63.3, 0), (63.6, 1), (OUT_T - 0.05, 1), (OUT_T, 0), (DUR, 0)])
    fxw = verb(fx_send * (1 - office)[:, None], street_ir, 0.5) + verb(fx_send * office[:, None], office_ir, 0.3)
    musw = verb(mus_send, street_ir, 0.55)
    music = (mus + musw) * duck[:, None] * env([(0, 1), (stop - 0.1, 1), (stop + 0.15, 0.0), (27.0, 0.0), (27.8, 1), (93, 1)])[:, None]
    mix = fx + fxw + music * 1.0 + vo
    mix = hp(mix, 25)
    mix *= env([(0, 1), (DUR - 1.2, 1), (DUR, 0)])[:, None]
    mix = np.tanh(mix * 1.4) / 1.4
    mix *= 10 ** (-1.0 / 20) / (np.max(np.abs(mix)) + 1e-9)
    return mix.astype(np.float32), have_vo


RUN_T = 0.7
if __name__ == "__main__":
    audio, have_vo = build()
    wavfile.write(OUT / "_audio.wav", SR, audio)
    rms = 20 * np.log10(np.sqrt(np.mean(audio ** 2)) + 1e-12)
    print(f"wrote {OUT / '_audio.wav'}  {len(audio) / SR:.2f}s  rms {rms:.1f} dBFS  voice-over: {'yes' if have_vo else 'no (captions only)'}")
