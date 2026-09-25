# Fentra Digital Studio — "Görünür" (animated brand film)

**Output:** `output/fentra-gorunur.mp4`, 1080×1920 (9:16), 24 fps, 93 s, H.264 + AAC, for Instagram Reels and TikTok.
`output/fentra-gorunur-preview.mp4` is a lighter copy of the same film for quick sharing.

The story is a noir chase that turns out to be a metaphor. A businessman in a trench coat and fedora runs from a group through narrow night streets. He is cornered in a dead end, the group switches on their flashlights, and he hides inside his coat. Then the reveal: they are customers holding their needs (a desk lamp, a rolled plan, a phone with a service request, a parcel, a document folder). They were never chasing him. They simply couldn't find him. A flashlight lens match-cuts into the globe lamp of his office, where enquiries now arrive, one of those customers walks calmly past the glass, and he gives the camera one small wink. End frame: the Fentra logo.

## How it's made

Everything is rendered in code and is fully deterministic, so any change re-renders identically.

- **Picture** (`src/`): a 2.5D graphic-novel animation drawn in Canvas2D.
  - The neighbourhood (`world.js`) is real 3D geometry seen through a perspective camera: stone facades, the same lanterns everywhere, wet-stone reflections, haze. That keeps the architecture and geography stable from shot to shot.
  - The characters (`characters.js`) are vector rigs with fixed palettes. The businessman is designed once and reused in every view (side run, back, front, seated). The run cycle is solved with inverse kinematics against planted toes, so the feet never slide.
  - `engine.js` handles per-figure lighting (rim light, torch spots, cast shadows) and the mirror reflections on wet stone.
- **Sound** (`scripts/audio.py`): fully synthesized and synced to cue times exported from the animation (`output/cues.json`).
  - Foley: footsteps on wet stone, the pursuers' steps, breathing, coat rustle, flashlight clicks.
  - Score: a staccato suspense cue that drops to near-silence at the dead end, a curious celesta reveal, a warm electric-piano office theme, one notification chime, a tiny glockenspiel on the wink, and a resolved chord for the logo.

## Shot list

| Time | Beat |
|---|---|
| 0:00–0:22 | **Chase.** Quiet street; he bursts round the corner. The group turns the same corner. Shoes on wet stone, side tracking shot, anxious glance back, the group running through a hanging lantern's light, their shadows sweeping a wall, a high angle into the alley, his hand gripping the corner. |
| 0:22–0:30 | **Dead end.** He slows and stops at a brick wall. Near silence, only his breathing. Slow push-in on his face. |
| 0:30–0:44 | **Flashlights.** Silhouettes fill the exit one by one. Click, click, click. Beams converge; his shadows multiply on the bricks; he hides inside his coat. |
| 0:44–1:01 | **Reveal.** A slow dolly along the five customers and their needs. He lowers the coat, looks at the objects, at the people, and understands. Narration 1–2. |
| 1:01–1:25 | **Office.** Flashlight lens → globe desk lamp. Coat over the chair, hat on the desk. Enquiries arrive on screen. A customer from the chase walks calmly past the glass. The wink. Narration 3–5. |
| 1:25–1:33 | **Brand.** Fentra logo · Web • SEO • GEO · Dijitalde görünür olun. · Birlikte başlayalım. Birlikte büyüyelim. · @fentra.digital |

## Voice-over

This environment has no natural-sounding Turkish text-to-speech: the neural voice sources are blocked by the network policy, and the only local option is robotic. So the narration currently appears as on-screen captions at its exact timecodes, and the mix leaves room for it.

To add the real narration, record the five lines as `assets/vo/line1.wav` … `assets/vo/line5.wav` (one line per file, any sample rate), then run `python3 scripts/audio.py && python3 scripts/encode.py`. They are placed automatically, with the music ducked underneath.

| File | Starts at | Line |
|---|---|---|
| line1.wav | 0:53.2 | Müşteriler sizden kaçmıyor… |
| line2.wav | 0:57.0 | Sadece sizi henüz bulamıyor. |
| line3.wav | 1:09.0 | Fentra ile dijital dünyada görünür olun. |
| line4.wav | 1:13.8 | Web, SEO ve dijital görünürlüğü tek bir yolculukta birleştirelim. |
| line5.wav | 1:20.6 | Markanızı birlikte büyütelim. |

## Rendering

```bash
npm install
pip install numpy scipy imageio-ffmpeg
node scripts/render.mjs            # frames → output/_video.mp4 and output/cues.json (~20 min on 4 CPU cores)
python3 scripts/audio.py           # → output/_audio.wav
python3 scripts/encode.py          # → output/fentra-gorunur.mp4 (+ preview)

node scripts/render.mjs --stills 12,39.5,83.6   # preview single frames → output/stills/
node scripts/render.mjs --sheet                  # character model sheet
```

Brand assets: `assets/fentra-logo.png` is the supplied logo, used unmodified: its light (reversed) variant for the dark end frame. The accent blue `#1C73FD` is sampled from it.
