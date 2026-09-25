"""Synthesizes the 20.000 s soundtrack for the Fentra brand film -> output/_audio.wav

Everything is generated here (no samples): city ambience, a restrained pad that
lifts through the middle, a soft low pulse, tactile interface ticks, and a warm
resolution on the brand reveal. Cue times mirror the timeline in src/film.js.
"""
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

SR = 48000
DUR = 20.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(20260925)
OUT = Path(__file__).resolve().parent.parent / "output"


def env(points):
    """Piecewise-linear envelope from [(time, value), ...]."""
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def sstep(a, b, x):
    x = np.clip((x - a) / (b - a), 0, 1)
    return x * x * (3 - 2 * x)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def pan(mono, p):
    """Equal-power pan, p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def place(buf, start, sig):
    i = int(start * SR)
    if i >= N:
        return
    n = min(len(sig), N - i)
    buf[i:i + n] += sig[:n]


def reverb_ir(seconds=3.2, predelay=0.018, damp=5200):
    n = int(seconds * SR)
    ir = np.zeros((n, 2))
    tt = np.arange(n) / SR
    for ch in range(2):
        noise = rng.standard_normal(n)
        noise = lp(noise, damp)
        ir[:, ch] = noise * np.exp(-tt * 6.9 / seconds)
    d = int(predelay * SR)
    ir = np.roll(ir, d, axis=0)
    ir[:d] = 0
    for k, (dt, g) in enumerate([(0.011, 0.5), (0.019, 0.35), (0.027, 0.3), (0.041, 0.22)]):
        ir[int(dt * SR), k % 2] += g
    return ir / np.sqrt(np.sum(ir ** 2))


def verb(x, ir, wet):
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
    return y * wet


# --------------------------------------------------------------------------- city ambience
def ambience():
    white = rng.standard_normal((N, 2))
    brown = np.cumsum(white, axis=0)
    brown -= np.stack([lp(brown[:, c], 0.4) for c in range(2)], axis=1)  # remove DC drift
    brown /= np.max(np.abs(brown)) + 1e-9
    rumble = np.stack([lp(brown[:, c], 220) for c in range(2)], axis=1)
    air = np.stack([bp(white[:, c], 900, 5000) for c in range(2)], axis=1) * 0.02
    mod = 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t + 1.2)
    amb = (rumble * 1.1 + air * 2.2) * mod[:, None]
    # distant car passes (soft band-passed swells travelling across the stereo field)
    for start, length, direction in [(0.6, 4.2, 1), (8.4, 3.8, -1), (12.6, 3.4, 1)]:
        n = int(length * SR)
        tt = np.linspace(0, 1, n)
        body = bp(rng.standard_normal(n), 180, 1400) * np.sin(np.pi * tt) ** 2.5
        p = direction * (tt * 1.6 - 0.8)
        a = (p + 1) * np.pi / 4
        seg = np.stack([body * np.cos(a), body * np.sin(a)], axis=1) * 0.09
        place(amb, start, seg)
    level = env([(0, 0), (0.9, 1), (3.8, 1), (4.4, 0.32), (7.9, 0.32), (8.3, 0.85), (12, 0.8), (15.8, 0.55), (16.4, 0), (20, 0)])
    return amb * level[:, None] * 0.11


# --------------------------------------------------------------------------- pad
def pad_voice(freq, start, end, amp, attack=1.2, release=1.6):
    n0, n1 = int(max(0, start - 0.01) * SR), int(min(DUR, end + release) * SR)
    tt = t[n0:n1] - start
    out = np.zeros((n1 - n0, 2))
    for side, detune in ((0, -0.0035), (1, 0.0035)):
        sig = np.zeros(n1 - n0)
        for h in range(1, 9):
            ph = rng.uniform(0, 2 * np.pi)
            wob = 1 + detune * np.sin(2 * np.pi * (0.13 + 0.02 * h) * tt + ph)
            sig += np.sin(2 * np.pi * freq * h * wob * tt + ph) / h ** 1.6
        out[:, side] = sig
    a = np.clip(tt / attack, 0, 1) ** 1.5
    r = np.clip((end + release - (tt + start)) / release, 0, 1) ** 1.2
    out *= (a * r)[:, None] * amp
    buf = np.zeros((N, 2))
    buf[n0:n1] = out
    return buf


def pad():
    chords = [
        # (start, end, midi notes)
        (0.2, 4.3, [38, 45, 52, 53, 57]),        # Dm(add9)
        (4.1, 8.2, [34, 41, 45, 50, 57]),        # Bbmaj7
        (8.0, 9.95, [31, 38, 41, 45, 50]),       # Gm9
        (9.8, 12.1, [34, 41, 48, 50, 55, 57]),   # Bb6/9 — the lift when the store is found
        (11.9, 16.0, [29, 36, 45, 52, 55]),      # Fmaj9 (building)
        (16.35, 20.0, [29, 36, 43, 45, 48, 55]),  # F add9 — resolution
    ]
    buf = np.zeros((N, 2))
    for s, e, notes in chords:
        for n in notes:
            n = n + 12 if n < 36 else n  # keep the pad out of the mud
            amp = 0.05 if n > 44 else 0.06
            buf += pad_voice(midi(n), s, e, amp, attack=1.0 if s > 0 else 1.8)
    # filter opens through the middle: tonal lift, then settles for the reveal
    cut = env([(0, 650), (4, 800), (8, 1000), (9.9, 1900), (12, 2300), (15.7, 3200), (16.1, 500), (16.5, 1700), (20, 1500)])
    out = np.zeros_like(buf)
    blocks = 256
    for c in range(2):
        z = np.zeros(2)
        x = buf[:, c]
        y = np.zeros(N)
        # time-varying one-pole x2 (cheap, smooth)
        s1 = s2 = 0.0
        for i in range(0, N, blocks):
            g = 1 - np.exp(-2 * np.pi * cut[i] / SR)
            seg = x[i:i + blocks]
            o = np.empty_like(seg)
            for k in range(len(seg)):
                s1 += g * (seg[k] - s1)
                s2 += g * (s1 - s2)
                o[k] = s2
            y[i:i + blocks] = o
        out[:, c] = y
    duck = env([(0, 1), (15.8, 1), (16.25, 0.15), (16.4, 1), (20, 1)])
    return out * duck[:, None]


# --------------------------------------------------------------------------- percussive / tactile
def thump(freq=52, dur=0.55, amp=0.5):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = freq * (1 + 0.9 * np.exp(-tt * 38))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 7.5) * (1 - np.exp(-tt * 900)) * amp


def tick(freq=3100, amp=0.06, dur=0.05):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    click = hp(rng.standard_normal(n), 2500) * np.exp(-tt * 900) * 0.6
    tone = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 120)
    return (click + tone) * amp


def bell(freq, dur=3.5, amp=0.12):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    partials = [(1, 1, 1.6), (2.0, 0.35, 2.4), (3.01, 0.18, 3.5), (4.2, 0.08, 5)]
    sig = sum(a * np.sin(2 * np.pi * freq * r * tt) * np.exp(-tt * d) for r, a, d in partials)
    return sig * (1 - np.exp(-tt * 400)) * amp


def mixsum(*sigs):
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[:len(x)] += x
    return out


def pluck(freq, amp=0.12, dur=1.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 3.2) + 0.25 * np.sin(2 * np.pi * freq * 4 * tt) * np.exp(-tt * 14)
    return sig * (1 - np.exp(-tt * 600)) * amp


def swell(dur, lo=300, hi=6000, amp=0.07, reverse=False):
    n = int(dur * SR)
    tt = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 512
    for i in range(0, n, blk):
        f = lo * (hi / lo) ** tt[i]
        out[i:i + blk] = bp(x[max(0, i - 2048):i + blk], f * 0.7, min(f * 1.4, SR / 2 - 100))[-len(x[i:i + blk]):]
    shape = tt ** 2.2 if not reverse else (1 - tt) ** 2
    return out * shape * amp


def shimmer(start, end, amp=0.03):
    """Soft high glide that follows the blue pulse down the street."""
    n = int((end - start) * SR)
    tt = np.arange(n) / SR
    u = tt / tt[-1]
    f = 1760 * (1 + 0.5 * u)
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(rng.standard_normal(n), 4000, 9000) * 0.5
    return sig * np.sin(np.pi * u) ** 1.5 * amp


def build():
    ir = reverb_ir()
    dry = np.zeros((N, 2))
    send = np.zeros((N, 2))

    dry += ambience()
    p = pad()
    dry += p * 0.9
    send += p * 0.5

    # low pulse: enters with shot 3, 84 bpm, restrained; stops for the reveal
    beat = 60 / 84
    for k, s in enumerate(np.arange(8.12, 15.8, beat)):
        a = 0.26 * min(1, 0.55 + k * 0.08)
        place(dry, s, pan(thump(amp=a), 0))
    for s in (4.28, 5.7):  # two distant heartbeats under the interface
        place(dry, s, pan(thump(amp=0.14, freq=48), 0))

    # interface: typing, scan, cards, the "found" ping
    for s, f in [(4.72, 3000), (4.8, 3300), (4.98, 2900), (5.06, 3200), (5.2, 3100), (5.3, 3400)]:
        place(dry, s, pan(tick(f, 0.05), 0.15))
    scan_n = int(0.55 * SR)
    tt = np.arange(scan_n) / SR
    scan = np.sin(2 * np.pi * np.cumsum(np.linspace(1200, 2400, scan_n)) / SR) * np.sin(np.pi * tt / tt[-1]) * 0.018
    place(dry, 5.45, pan(scan, 0.1)); place(send, 5.45, pan(scan, 0.1))
    for s, f in [(5.7, 2600), (5.86, 2750), (6.02, 2900)]:
        place(dry, s, pan(tick(f, 0.045), -0.1))
    ping = mixsum(bell(midi(81), 3.2, 0.09), bell(midi(88), 2.6, 0.035))   # A5 + E6
    place(dry, 6.35, pan(ping, 0.05)); place(send, 6.35, pan(ping, 0.05) * 1.4)

    # transitions
    place(dry, 3.55, pan(swell(0.8, 250, 5000, 0.05), -0.2)); place(send, 3.55, pan(swell(0.8, 250, 5000, 0.05), -0.2))
    place(dry, 7.45, pan(swell(0.75, 300, 7000, 0.06), 0.2)); place(send, 7.45, pan(swell(0.75, 300, 7000, 0.06), 0.2))
    place(dry, 15.55, pan(swell(0.85, 200, 6000, 0.06), 0)); place(send, 15.55, pan(swell(0.85, 200, 6000, 0.06), 0))

    # shot 3: shimmer along the pulse, warm bloom when the hero store is found
    sh = shimmer(8.25, 11.3)
    place(dry, 8.25, np.stack([sh * 0.8, sh], axis=1)); place(send, 8.25, pan(sh, 0) * 1.2)
    bloom = bell(midi(74), 3.0, 0.07) + bell(midi(81), 3.0, 0.04)
    place(dry, 9.9, pan(bloom, 0.25)); place(send, 9.9, pan(bloom, 0.25) * 1.5)

    # WEB / SEO / GEO — three plucks rising (A4, C5, E5), then the "system" chord
    for s, n, pn in [(12.45, 69, -0.25), (13.05, 72, 0.0), (13.65, 76, 0.25)]:
        place(dry, s, pan(pluck(midi(n), 0.1), pn)); place(send, s, pan(pluck(midi(n), 0.1), pn) * 1.3)
    sysc = sum(bell(midi(n), 2.8, 0.03) for n in (65, 69, 72, 76))
    place(send, 14.25, pan(sysc, 0) * 1.6); place(dry, 14.25, pan(sysc, 0) * 0.6)

    # brand reveal: silence, then resolution
    place(dry, 16.45, pan(thump(40, 1.6, 0.34), 0))
    res = mixsum(bell(midi(77), 4.0, 0.09), bell(midi(84), 3.6, 0.05))      # F5 + C6
    place(dry, 16.5, pan(res, 0)); place(send, 16.5, pan(res, 0) * 1.6)
    last = bell(midi(81), 2.2, 0.05)                                   # A5 on the final line
    place(dry, 18.25, pan(last, 0.1)); place(send, 18.25, pan(last, 0.1) * 1.6)

    mix = dry + verb(send, ir, 0.42)
    mix = np.stack([sosfiltfilt(butter(2, 28, "high", fs=SR, output="sos"), mix[:, c]) for c in range(2)], axis=1)
    fade = env([(0, 0), (0.05, 1), (19.2, 1), (20, 0.0)])
    mix *= fade[:, None]
    # gentle glue + ceiling
    mix = np.tanh(mix * 1.6) / 1.6
    peak = np.max(np.abs(mix))
    mix *= 10 ** (-1.0 / 20) / peak
    return mix.astype(np.float32)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    audio = build()
    wavfile.write(OUT / "_audio.wav", SR, audio)
    rms = 20 * np.log10(np.sqrt(np.mean(audio ** 2)) + 1e-12)
    print(f"wrote {OUT / '_audio.wav'}  {len(audio) / SR:.3f}s  rms {rms:.1f} dBFS")
