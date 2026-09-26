# Fentra Digital Studio — "Görünür" (animated brand film)

**Output:** `output/fentra-gorunur.mp4`, 1080×1920 (9:16), 24 fps, 98.5 s, H.264 + AAC, for Instagram Reels and TikTok.
`output/fentra-gorunur-preview.mp4` is a lighter copy of the same film for quick sharing.

The story is a noir chase that turns out to be a metaphor. A businessman in a trench coat and fedora runs from a group through narrow night streets. He is cornered in a dead end, the group switches on their flashlights, and he hides inside his coat. Then the reveal: they are customers holding their needs (a desk lamp, a rolled plan, a phone with a service request, a parcel, a document folder). They were never chasing him. They simply couldn't find him. A flashlight lens match-cuts into the globe lamp of his office, where enquiries now arrive, one of those customers walks calmly past the glass, and he gives the camera one small wink. End frame: the Fentra logo.

## How it's made

Everything is rendered in code and is fully deterministic, so any change re-renders identically.

- **Picture** (`src/`): a 2.5D graphic-novel animation drawn in Canvas2D.
  - The neighbourhood (`world.js`) is real 3D geometry seen through a perspective camera: stone facades, the same lanterns everywhere, wet-stone reflections, haze. That keeps the architecture and geography stable from shot to shot.
  - The characters are split across two files. `faces.js` holds the faces, hats and props. `rig.js` holds the bodies.
    - Limbs are drawn as anatomical outlines (thigh, knee, calf, ankle, shoulder, elbow) rather than tubes. Hands have real shapes: a loose running fist, a relaxed hanging hand, a grip.
    - The run and walk cycles are keyframed from standard running poses (heel recovery, knee drive, reach, planted stance with heel roll), with pelvic rotation and counter-swinging arms. The feet are solved by inverse kinematics, so they never slide.
    - The back-view run is driven by the same motion data, so the legs bend correctly.
    - The businessman is designed once and reused in every view. Seated at his desk he is drawn full-body: legs and shoes under the desk, hands on the keyboard.
  - `engine.js` handles per-figure lighting (rim light, torch spots, cast shadows) and the mirror reflections on wet stone.
- **Sound** (`scripts/audio.py`): fully synthesized and synced to cue times exported from the animation (`output/cues.json`).
  - Foley: footsteps on wet stone, the pursuers' steps, breathing, coat rustle, flashlight clicks.
  - Score: a staccato suspense cue that drops to near-silence at the dead end, a curious celesta reveal, a warm electric-piano office theme, one notification chime, a tiny glockenspiel on the wink, and a resolved chord for the logo.

## v3: realism, cinema craft and neuro-marketing

**Camera and image**
- True motion blur: every frame averages 3–5 sub-frames across a 180° shutter (1/48 s), never across a cut.
- Highlight bloom and halation around lights, a cinematic grade, and subtle handheld sway on the chase shots only (the office stays locked off).
- Depth of field on close-ups and inserts.

**World**
- Stone coursing, weathering streaks, window reveals, louvered shutters, wrought-iron balconies with plants, curtained lit windows, painted wooden shopfronts with striped awnings, panelled doors, drainpipes, and slate mansard roofs with dormers and chimneys.
- Street life: bollards, olive trees in planters, overhead cables, a distant dome.
- Weather and atmosphere: manhole steam, moths at the lanterns, a fine drizzle that is only visible where it crosses lamp light, ripples on the wet stone, and raindrops on both windows.

**Characters**
- The trench coat's hem is a damped spring-mass simulation driven by the body's real vertical acceleration and air turbulence.
- Faces blink on their own schedules, make small saccades, and have catchlights, eyelid creases, shaped lips and nostrils.
- Stopping has momentum (the upper body pitches forward, then settles).

**Cinema rules applied**
- A cold open on an extreme close-up (an eye under the brim, a slit of light).
- The 180° rule: he always runs screen-right.
- Cutting on action, restrained audio accents on the cuts, and eyeline matches in the reveal.
- A shot scale ladder (ECU → CU → MS → WS) and motivated camera moves: tracking, crane, push-in.
- The match cut from flashlight lens to globe lamp.
- A final crane-out for the ending.

**Marketing and neuroscience**
- **Hook in the first 1.3 s:** an extreme close-up eye plus a curiosity gap ("why is he afraid?").
- **Tension → release arc:** suspense, then surprise, then relief.
- **Social connection:** faces toward the camera and eye contact. The wink is the emotional peak, delivered with steady eye contact (no random blink).
- **Colour:** Fentra blue appears only at moments of being *found*: the notification, the glint as each window lights, the brand word.
- **Sonic branding:** a 3-note Fentra motif (G–C–E). Its first two notes are the notification chime, it spreads with the city lights, and it lands in full with the logo.
- **Peak–end rule:** the warmest moment (wink → his glowing window → a city lighting up) comes right before the brand.
- **Sound-off viewing:** captions for every narration line.

## Typography

- Narration captions: Playfair Display italic (cinematic subtitle style, soft shadow band for legibility).
- End frame: a Playfair Display headline with the word *görünür* in italic Fentra blue, the service line in widely tracked Manrope capitals, and the closing lines in italic serif.
- Interface cards: Manrope.

All fonts are bundled locally with full Turkish glyphs (ç ğ ı İ ö ş ü).

## Shot list

| Time | Beat |
|---|---|
| 0:00–0:22 | **Chase.** Quiet street; he bursts round the corner. The group turns the same corner. Shoes on wet stone, side tracking shot, anxious glance back, the group running through a hanging lantern's light, their shadows sweeping a wall, a high angle into the alley, his hand gripping the corner. |
| 0:22–0:30 | **Dead end.** He slows and stops at a brick wall. Near silence, only his breathing. Slow push-in on his face. |
| 0:30–0:44 | **Flashlights.** Silhouettes fill the exit one by one. Click, click, click. Beams converge; his shadows multiply on the bricks; he hides inside his coat. |
| 0:44–1:01 | **Reveal.** A slow dolly along the five customers and their needs. He lowers the coat, looks at the objects, at the people, and understands. Narration 1–2. |
| 0:00–0:01 | **Cold open.** One eye under the brim, a slit of street light, breath in the cold air, a raindrop falling from the brim. |
| 1:01–1:24 | **Office.** Flashlight lens → globe desk lamp. Coat over the chair, hat on the desk. Enquiries arrive on screen. A customer from the chase walks calmly past the glass. The wink. Narration 3–5. |
| 1:24–1:31 | **Outside.** Through his rain-dotted window, the camera cranes back. His window glows in the wet facade, customers with umbrellas walk calmly to his door, and a wave of windows lights up across the neighbourhood, each with a faint Fentra-blue glint. |
| 1:31–1:38 | **Brand.** The city softens into bokeh: Fentra logo · WEB · SEO · GEO · Dijitalde *görünür* olun. · Birlikte başlayalım. Birlikte büyüyelim. · @fentra.digital, with the full sonic logo. |

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
