# Fentra Digital Studio — "Görünmeyen Dükkân" (The Invisible Shop)

**Output:** `output/fentra-gorunmeyen-dukkan.mp4`, 1080×1920 (9:16), 30 fps, 28.8 s, H.264 High + AAC, for Instagram Reels and TikTok.
`output/fentra-gorunmeyen-dukkan-preview.mp4` is a lighter copy of the same film for quick sharing.

A warm city street drawn as a clean, editorial line illustration. Among the florist, the café and the bookshop, one shop is there only as a faint under-drawing: the gap exists, the storefront is implied, but it has no presence. People walk past it, a woman standing right in front of it scans the street and chooses the café next door. The camera rises into the sunlight, a small Fentra-blue signal appears in the sky and descends as a single precise line. When it touches the shop, the line *draws* the storefront into existence: outline, structure, sign, awning, glass, warm lights. The street notices, one person at a time, and a healthy queue forms. End frame: the Fentra logo and *Görünür olmak tesadüf değildir.*

## Shot list

| Time | Shot | On screen |
|---|---|---|
| 0:00–0:05 | **The street.** Wide establishing shot, slow dolly right: sky and rooftops, a florist, a café with a woman at a table outside, a bookshop. A car and a moped pass, a man walks by with a coffee, a couple heads for the café. One storefront in the middle is only a faded sketch. | — |
| 0:05–0:07.6 | **Unnoticed.** Medium shot on the faded shop. The couple goes into the café; a woman arrives from the right, reading her phone, and stops in front of the invisible shop. | *Müşteri sizi göremiyorsa…* |
| 0:07.6–0:10.3 | **Unseen, not rejected.** Closer. She lowers her phone and scans the street: the bookshop, then her gaze sweeps straight across the shop in front of her, and lands on the café. A small smile; she heads there. The music holds its breath. | *…sizi seçemez.* |
| 0:10.3–0:12.4 | **Up into the light.** Cut to the whole building from across the street: the faded shop is a pale gap at its foot. The camera slowly cranes up, out of the street's shade into warm sunlight and sky. Birds cross. A small blue signal appears: a slanted glint echoing the geometry of the Fentra mark. | — |
| 0:12.4–0:15 | **The signal descends.** A thin, controlled line of Fentra-blue light draws itself down the building; the camera follows it down to the shop. | — |
| 0:15–0:19 | **The reveal.** Where it lands, the line splits and traces the storefront (outline, pilasters, windows, door), then the shop gains its structure, the sign *PASTANE* resolves letter by letter, the awning unfolds, a highlight crosses the glass, the pendant lights come on one warm layer at a time, planters and light spill on the pavement. | — |
| 0:19–0:24.8 | **Discovered.** A passer-by slows and looks; a second turns her head; he walks to the entrance; she follows; the bookshop browser comes over; the woman from the café comes out with her coffee and finally sees it; a customer leaves with a bag; a queue forms. The camera eases back to show the whole street. | *Fentra ile dijital dünyada görünür olun.* |
| 0:24.8–0:28.8 | **Brand.** The street dissolves into warm paper. The same blue line underlines the Fentra logo. | Fentra logo · *Görünür olmak tesadüf değildir.* · WEB • SEO • GEO · @fentra.digital |

## How it's made

Everything is rendered in code (Canvas 2D in headless Chromium) and is fully deterministic: every frame is a pure function of time, so any change re-renders identically.

- **One continuous world.** Every shot is a camera looking at the same street at the same moment in time. People, cars and the shop never duplicate or jump between cuts; the couple seen in the wide shot is the couple entering the café in the next shot, and the woman who picked the café is the one who later walks out with a coffee.
- **Street** (`src/street.js`): a real 3D block seen through a perspective camera that looks straight at the facades, so architecture stays perfectly stable while the ground, awnings, balconies, door recesses and shop interiors (on a plane behind the glass) move with correct parallax. Stucco texture, window reveals with sun-side shadows, shutters, flower boxes, balconies, mansards and a roof garden; the street sits in soft shade with warm sun on the upper floors.
- **The invisible shop** is the finished shopfront at a few percent opacity, washed out and colourless, with its construction lines barely visible. The reveal composites the real shop layer by layer (structure, sign, awning, glass, light, planters) on top of the blue trace.
- **People** (`src/people.js`): a 2.5D puppet. Joints are in 3D body space and projected by the street camera, so the same character reads correctly in profile, three-quarter and back views and can turn their head. Feet are solved from planted footfalls, so they never slide; gait cadence follows walking speed and settles into a standing pose. Heads have a proper face/hair split, ears, eyes that blink, brows and a mouth that can smile.
- **Vehicles** (`src/vehicles.js`): a small hatchback with rolling wheels and a sliding reflection, and a classic moped with its rider.
- **Camera and post:** adaptive motion blur (a 180° shutter sampled from 1 to 40 times per frame depending on how far anything moves on screen, so lines never double; never across a cut), a soft vignette, a warm grade and a gentle paper grain.
- **Sound** (`scripts/audio.py`): fully synthesized and synced to cues exported from the animation (`output/cues.json`): footsteps of the people on screen, the car and moped passes, doors, a shop bell, birds, a soft crowd. The score moves from a reflective felt piano (Dm9 · B♭maj7 · F/A · Gm7) through a held breath on *…sizi seçemez.* to a warm, uplifting 96 bpm progression that swells as the lights come on, and ends on the Fentra motif (G–C–E) under the logo.

## Typography and brand

- Captions and the slogan: Instrument Serif italic, on a soft paper band so they read over any part of the street; placed within the Reels/TikTok safe area.
- Services and handle: Manrope. Shop signs: Fraunces and Manrope. All fonts are bundled locally with full Turkish glyphs.
- The logo is the supplied Fentra artwork (`assets/fentra-logo-original.png`), used unmodified in its original colours on the light end frame. The accent blue `#1C73FD` is sampled from it and is used only for the signal, the trace line and the end frame.

## Voice-over

The narration is shown as captions. To add a recorded voice, save the lines as `assets/vo/line1.wav` … `assets/vo/line4.wav` (one line per file, any sample rate) and run `python3 scripts/audio.py && python3 scripts/encode.py`. They are placed automatically with the music and ambience ducked underneath.

| File | Starts at | Line |
|---|---|---|
| line1.wav | 0:05.6 | Müşteri sizi göremiyorsa… |
| line2.wav | 0:08.7 | …sizi seçemez. |
| line3.wav | 0:20.6 | Fentra ile dijital dünyada görünür olun. |
| line4.wav | 0:26.25 | Görünür olmak tesadüf değildir. |

## Rendering

```bash
npm install
pip install numpy scipy imageio-ffmpeg
node scripts/render.mjs            # frames → output/_video.mp4 and output/cues.json (~20 min on 4 CPU cores)
python3 scripts/audio.py           # → output/_audio.wav
python3 scripts/encode.py          # → output/fentra-gorunmeyen-dukkan.mp4 (+ preview)

node scripts/render.mjs --stills 3,8.3,17.9,24.7   # preview single frames → output/stills/
node scripts/render.mjs --range 14,20              # preview a section → output/_range.mp4
```

Timing lives in `T` and `CAPTIONS` at the top of `src/film.js`; the cast and their choreography are in `ACTORS` in the same file.
