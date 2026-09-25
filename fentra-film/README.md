# Fentra Digital Studio — Brand Film (20 s, 9:16)

**Output:** `output/fentra-brand-film.mp4` — 1080×1920, 24 fps, exactly 20.000 s, H.264 High + AAC 320 kbps, ready for Reels / TikTok.

The film is fully rendered in code: a real-time 3D architectural scene (Three.js) is captured frame by frame in headless Chromium, and the score is synthesized in NumPy. Because it is deterministic, any change (timing, colour, copy, logo) can be re-rendered to exactly the same result.

## Structure

| Time | Shot | On screen |
|---|---|---|
| 0:00–0:04 | **Presence without visibility**: blue-hour pedestrian street, refined storefronts (boutique, café, gallery, architecture studio, design studio) lit low and cool. Slow 35 mm dolly. | İyi olmak yetmez. |
| 0:04–0:08 | **Discovery begins**: the street defocuses behind an abstract discovery interface (search field, three result cards whose thumbnails are renders of the street's own storefronts). A Fentra-blue pulse descends the rail and one card is found. | Müşteriler sizi aramaz. / Sizi bulurlar. |
| 0:08–0:12 | **Existing vs. being found**: a blue linear light set into the paving travels down the street. As it passes, storefronts warm up and gain definition. The gallery stays unnoticed; the architecture studio becomes the most visible and memorable. | Bazıları sadece vardır. / Bazıları bulunur. |
| 0:12–0:16 | **The Fentra system**: a rising reveal up the hero building. WEB, SEO and GEO anchor to its three levels, each floor lights in turn, and one blue spine ties them into a single system. | WEB · SEO · GEO, then *Biz işletmeleri dijitalde daha görünür hale getiriyoruz.* |
| 0:16–0:18 | **Brand reveal**: the scene falls away and the blue spine resolves into the brand hairline on warm charcoal. | [logo] · WEB • SEO • GEO · Dijitalde daha görünür. / Daha güçlü. |
| 0:18–0:20 | **End frame**: held. | [logo] · Görünür olmak tesadüf değildir. · @fentra.digital |

**Sound:** filtered city ambience with distant passes; a pad (Dm9 → B♭maj7 → Gm9 → B♭6/9 → Fmaj9 → F add9) whose filter opens through the middle; a restrained 84 bpm low pulse from shot 3; tactile ticks and a glass ping for the interface; three rising plucks for WEB / SEO / GEO; silence, then a warm resolution on the reveal.

## Logo — required before publishing

No Fentra logo file was supplied, and the brief forbids approximating it, so the end frames leave a clean, empty logo area above the blue hairline.

To add the real logo, save it as **`assets/fentra-logo.svg`** (preferred) or **`assets/fentra-logo.png`** (transparent background, light version for a dark background) and re-render. It is placed as-is, centred, max 560×200 px. Nothing is redrawn.

## Brand colour

The accent is `#3d74f0`. If Fentra's exact blue differs, change `BLUE_HEX` in `src/film.js` and `--blue` in `src/style.css`, then re-render.

## Rendering

Needs Node 18+, Python 3.10+, and a Chromium for Playwright.

```bash
npm install
pip install numpy scipy imageio-ffmpeg
npm run build          # frames (~35 min on CPU) → audio → mux
# or step by step:
node scripts/render.mjs                  # output/_video.mp4
node scripts/render.mjs --stills 2,9.2   # preview stills → output/stills/
python3 scripts/audio.py                 # output/_audio.wav
python3 scripts/encode.py                # output/fentra-brand-film.mp4
```

You can open `src/index.html` through any static server (from the project root) and call `renderAt(t)` in the console to scrub.
