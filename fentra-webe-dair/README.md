# Fentra · WEB'E DAİR — informational series

**Episode 1 — "Adres, Bina, Yol"** (domain, hosting, DNS)

**Output:** `output/webe-dair-bolum-01.mp4`, 1080×1920 (9:16), 30 fps, 96.6 s, H.264 + AAC 320 kbps, -14 LUFS, for Instagram Reels and TikTok. `output/webe-dair-bolum-01-preview.mp4` is a lighter 720p copy for quick sharing.

The script, storyboard and the voice-over text as recorded are in `senaryo/bolum-01.md`.

## Idea

Every concept is shown twice, so that someone who knows nothing about the web understands it:

- **The metaphor:** a cinematic night-time 3D city (Three.js). The domain is a sign with the address, hosting is the servers and the building on the lot, and DNS is a blue route drawn through the streets from the city gate to the right door.
- **Real life:** the "GERÇEKTE" card in the corner shows what the same thing looks like on a screen: the search result, the address bar, the parts of a domain, the site's files, the phonebook, the DNS record.

Elements travel between the two layers. The address flies from the address bar onto the sign, the site's texts, photos and menu fly into the servers, and the DNS record flies to the city gate and becomes the route.

Other layers on top of the city:

- a chapter bar (01 ADRES · 02 BİNA · 03 YOL)
- term cards (DOMAIN, HOSTING, IP ADRESİ, DNS)
- labels pinned to the 3D city (SUNUCU, 7/24 AÇIK, SİZİN ALANINIZ, IP numbers)
- captions that highlight the word being spoken
- a glossary card to save
- a teaser for the next episode (SSL)

Fentra blue (#1C73FD) lights up only when something clicks into place. Type is Manrope, with JetBrains Mono for addresses and numbers. The search screen evokes Google without using its logo. All IPs shown are from the documentation ranges (203.0.113.x, 198.51.100.x, 192.0.2.x).

## Timing

Everything is locked to the recorded voice (`assets/vo/bolum-01.mp3`, ElevenLabs).

1. `scripts/align.py` splits the recording at its pauses and matches the transcript to it (`scripts/vo_text.py`, spoken and captioned spelling side by side) with dynamic programming on syllable counts.
2. It writes word-level times to `src/cues.js` and `output/cues.json`.
3. `src/timeline.js` names every beat after the word it lands on, for example `T.dName` is the moment "websiteniz.com" is said.
4. The picture, captions and sound all read from these beats. A new recording only needs `npm run cues` and a re-render.

## How it's made

- `src/city.js`: the 3D city.
  - Instanced buildings with procedural, anti-aliased windows; street lights, cars and a park.
  - The hero lot: the sign, the server racks with blinking LEDs and your highlighted slice, and a glass tower that rises floor by floor.
  - The second hosting, the gate, the DNS route ribbons with a travelling light, the curb-light wave and the update ripple.
  - The night-to-day sweep on "gece gündüz", and bloom.
- `src/camera.js`: C1-continuous camera moves through time-keyed shots.
- `src/overlay.js` + `src/style.css`: every 2D layer (phone, card, labels, captions, title, glossary, end frame). It is a pure function of time.
- `scripts/audio.py`: an energetic 112 bpm bed (C – Am – F – G) that ducks about 10 dB under the voice.
  - Sound effects for every on-screen action: typing, taps, cards, pins, whooshes, the route riser and arrival chime, and a rewind for the recap.
  - The Fentra sonic logo (G – C – E) on the end frame.
  - Normalized to -14 LUFS with a -1.2 dBTP ceiling.

## Rendering

Needs Node 18+, Python 3.10+ and a Chromium for Playwright.

```bash
npm install
pip install numpy scipy imageio-ffmpeg pyloudnorm pillow
npm run cues                                  # align the voice → src/cues.js, output/cues.json
node scripts/render.mjs                       # frames → output/_video.mp4 (~2 s per frame on a 4-core CPU)
python3 scripts/audio.py                      # → output/_audio.wav
python3 scripts/encode.py                     # → output/webe-dair-bolum-01.mp4 (+ preview)

node scripts/render.mjs --stills 9.5,24.3,64.4   # single frames → output/stills/
python3 scripts/sheet.py 9.5,24.3,64.4 output/stills/_sheet.png   # contact sheet of stills
```

You can also open `src/index.html` through any static server (from the project folder) and call `renderAt(t)` in the console to scrub.

## Next episodes

Copy the structure: record the new voice into `assets/vo/`, write both spellings in `scripts/vo_text.py`, run `npm run cues`, then point the beats in `src/timeline.js` at the new words. The city, the "GERÇEKTE" card and the chapter bar are reusable. Each episode adds a piece to the city: next is the lock on the door (SSL).
