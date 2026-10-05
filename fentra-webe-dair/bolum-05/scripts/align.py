"""Aligns the recorded voice-over (assets/vo/bolum-05.mp3) to the transcript in vo_text.py.

The voice is split into speech segments at its pauses, then the transcript phrases (split at
punctuation) are matched to those segments with dynamic programming on syllable-predicted duration.
Word times inside a phrase are spread by syllable count. Until the recording exists, a provisional
timeline is predicted from syllable counts and punctuation pauses (measured on episode 3's voice). Writes:
  src/cues.js         timeline used by the animation (scenes, sentences, phrases, words, caption chunks)
  output/cues.json    the same data for the audio mix
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np, imageio_ffmpeg

sys.path.insert(0, str(Path(__file__).parent))
from vo_text import SCENES

ROOT = Path(__file__).resolve().parent.parent            # bolum-05/
VO = ROOT.parent / "assets/vo/bolum-05.mp3"
TAIL = 3.2  # seconds after the last word for the end frame and sonic logo

VOW = set("aeıioöuüAEIİOÖUÜ")
def syl(s): return max(1, sum(ch in VOW for ch in s))
SPOKEN_SYL = {"CDN": 3, "CDN,": 3, "Google": 2, "Google'ın": 3, "Web'e": 2, "Fentra'yla": 3}
def wsyl(w):
    core = w.strip(",.:;?!…\"")
    return SPOKEN_SYL.get(core, syl(core))

def split_phrases(s):
    return [p for p in re.split(r"(?<=[,.:?!…])\s+", s.replace("...", "…").strip()) if p]

phr = []
for scene, sents in SCENES:
    for k, (sp, cap) in enumerate(sents):
        a, b = split_phrases(sp), split_phrases(cap)
        assert len(a) == len(b), (a, b)
        for pa, pb in zip(a, b): phr.append(dict(scene=scene, sent=k, spoken=pa, caption=pb.replace("…", "...")))

SR = 16000; HOP = 160
if VO.exists():
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "quiet", "-i", str(VO), "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = len(x) // HOP
    db = 20 * np.log10(np.sqrt(np.mean(x[:n * HOP].reshape(n, HOP) ** 2, axis=1) + 1e-12))
    sil = db < db.max() - 38

    segs, i = [], 0
    while i < n:
        if sil[i]:
            i += 1; continue
        j = i
        while True:
            while j < n and not sil[j]: j += 1
            k = j
            while k < n and sil[k]: k += 1
            if k < n and k - j < 14: j = k; continue
            break
        if (j - i) * HOP / SR > 0.06: segs.append((i * HOP / SR, j * HOP / SR))
        i = j
    PROVISIONAL = False
else:
    # no recording yet: one speech segment per phrase, at episode 3's pace and pauses
    RATE, GAP = 0.1836, {".": 0.44, ",": 0.16, ":": 0.25, "?": 0.46, "!": 0.6}
    segs, t = [], 0.05
    for k, p in enumerate(phr):
        d = RATE * syl(p["spoken"]); segs.append((t, t + d)); t += d
        if k + 1 < len(phr): t += 0.52 if phr[k + 1]["scene"] != p["scene"] else GAP.get(p["spoken"].strip()[-1], 0.16)
    x = np.zeros(int((t + 0.3) * SR), np.float32)
    PROVISIONAL = True
    print("no recording at", VO, "- provisional timeline from syllable counts")

S = np.array([syl(p["spoken"]) for p in phr]); D = np.array([b - a for a, b in segs])
rate = D.sum() / S.sum()
I, J = len(segs), len(phr)
C = np.full((I + 1, J + 1), np.inf); C[0, 0] = 0; back = {}
for i in range(I + 1):
    for j in range(J + 1):
        if not np.isfinite(C[i, j]): continue
        for a in (1, 2, 3):
            for b in (1, 2, 3, 4, 5):
                if i + a > I or j + b > J: continue
                dur = segs[i + a - 1][1] - segs[i][0]
                c = 4 * np.log(dur / (rate * S[j:j + b].sum())) ** 2 + 0.35 * (a - 1) + 0.25 * (b - 1)
                if C[i, j] + c < C[i + a, j + b]:
                    C[i + a, j + b] = C[i, j] + c; back[(i + a, j + b)] = (i, j)
path, cur = [], (I, J)
while cur != (0, 0):
    prev = back[cur]; path.append((prev, cur)); cur = prev
for (i0, j0), (i1, j1) in reversed(path):
    t0, t1 = segs[i0][0], segs[i1 - 1][1]
    w = S[j0:j1] / S[j0:j1].sum(); edges = t0 + np.concatenate([[0], np.cumsum(w)]) * (t1 - t0)
    for m, j in enumerate(range(j0, j1)):
        phr[j]["start"], phr[j]["end"] = round(float(edges[m]), 3), round(float(edges[m + 1]), 3)

words = []
for pi, p in enumerate(phr):
    ws = p["caption"].split()
    wt = np.array([wsyl(w) for w in ws], float); wt /= wt.sum()
    e = p["start"] + np.concatenate([[0], np.cumsum(wt)]) * (p["end"] - p["start"])
    p["words"] = []
    for m, wd in enumerate(ws):
        p["words"].append(len(words))
        words.append(dict(w=wd, start=round(float(e[m]), 3), end=round(float(e[m + 1]), 3), phrase=pi))

sentences, scenes = [], {}
for scene, sents in SCENES:
    for k, (sp, cap) in enumerate(sents):
        ps = [p for p in phr if p["scene"] == scene and p["sent"] == k]
        sentences.append(dict(scene=scene, idx=k, caption=cap, start=ps[0]["start"], end=ps[-1]["end"],
                              phrases=[phr.index(p) for p in ps]))
    ss = [s for s in sentences if s["scene"] == scene]
    scenes[scene] = dict(start=ss[0]["start"], end=ss[-1]["end"])

# caption chunks: whole phrases, never across sentences, at most MAXC characters; a phrase longer than
# that is split at word boundaries into balanced parts
MAXC = 50
CLITIC = {"bile", "de", "da", "ve", "ise", "ile", "mi", "mı", "kadar"}  # never start a caption line with these
NOBREAK = {"bir", "en", "farklı", "aynı", "kaliteli", "uzun", "çok", "daha", "tek", "büyük", "yanlış", "hosting", "kilide", "Çoğu", "her"}  # nor end one with these
def wlen(ws): return len(" ".join(words[w]["w"] for w in ws))
def balanced(ws):
    k = -(-wlen(ws) // MAXC)
    if k <= 1: return [ws]
    best = None
    def rec(rest, k):
        if k == 1: return [[rest]]
        return [[rest[:m]] + tail for m in range(1, len(rest) - k + 2) for tail in rec(rest[m:], k - 1)]
    for parts in rec(ws, k):
        score = (max(wlen(q) for q in parts) + 12 * sum(words[q[0]]["w"] in CLITIC for q in parts[1:])
                 + 12 * sum(words[q[-1]]["w"] in {"ve", "ile"} for q in parts[:-1])
                 + 15 * sum(words[q[-1]]["w"] in NOBREAK for q in parts[:-1])
                 + 10 * sum(words[q[-1]]["w"][-1] not in ",.:;?!" for q in parts[:-1])
                 + 20 * sum(" ".join(words[w]["w"] for w in q).count('"') % 2 for q in parts))
        if best is None or score < best[0]: best = (score, parts)
    return best[1]
chunks = []
for s in sentences:
    cur = []
    for pi in s["phrases"]:
        pw = phr[pi]["words"]
        if cur and wlen(cur + pw) > MAXC:
            if wlen(cur) <= 18:                      # too short to stand alone: balance it with the next phrase
                parts = balanced(cur + pw); chunks.extend(parts[:-1]); cur = list(parts[-1]); continue
            chunks.append(cur); cur = []
        if wlen(pw) > MAXC:
            parts = balanced(pw); chunks.extend(parts[:-1]); cur = list(parts[-1])
        else:
            cur += pw
    chunks.append(cur)
chunk_out = []
NO_CAPTION = {("title", 0), ("title", 1), ("outro", 2)}  # said by the title card and the end frame
for c in chunks:
    ph = phr[words[c[0]]["phrase"]]
    if (ph["scene"], ph["sent"]) in NO_CAPTION: continue
    chunk_out.append(dict(words=c, start=words[c[0]]["start"], end=words[c[-1]]["end"]))
for a, b in zip(chunk_out, chunk_out[1:]):
    a["hide"] = round(min(b["start"] - 0.04, a["end"] + 0.7), 3)
chunk_out[-1]["hide"] = round(chunk_out[-1]["end"] + 0.6, 3)

worst = sorted(((p["end"] - p["start"]) / (rate * syl(p["spoken"])), p["spoken"]) for p in phr)
print("phrase duration / predicted, lowest:", [(round(r, 2), t) for r, t in worst[:3]])
print("phrase duration / predicted, highest:", [(round(r, 2), t) for r, t in worst[-3:]])
vo_dur = len(x) / SR
data = dict(provisional=PROVISIONAL, voDuration=round(vo_dur, 3), duration=round(phr[-1]["end"] + TAIL, 2), scenes=scenes,
            sentences=sentences, phrases=phr, words=words, chunks=chunk_out)
(ROOT / "output").mkdir(exist_ok=True)
(ROOT / "output/cues.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
(ROOT / "src").mkdir(exist_ok=True)
(ROOT / "src/cues.js").write_text("// generated by scripts/align.py from the " + ("PROVISIONAL syllable timeline" if PROVISIONAL else "recorded voice-over") + "\nexport default "
                                  + json.dumps(data, ensure_ascii=False) + ";\n")
print(f"voice {vo_dur:.2f}s, film {data['duration']}s, {len(segs)} segments, {len(phr)} phrases, {len(words)} words, {len(chunk_out)} caption chunks")
for k, v in scenes.items(): print(f"  {k:8s} {v['start']:6.2f} – {v['end']:6.2f}")
for c in chunk_out:
    print(f"  {c['start']:6.2f}-{c['hide']:6.2f}  " + " ".join(words[w]["w"] for w in c["words"]))
