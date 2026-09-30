# WEB'E DAİR · Bölüm 2 — "Kapınızdaki kilit" (HTTP, HTTPS, SSL)

**Output:** `output/webe-dair-bolum-02.mp4`, 1080×1920 (9:16), 30 fps, 119.9 s, H.264 + AAC, -14 LUFS.

- `output/webe-dair-bolum-02-paylasim.mp4`: the same resolution under 30 MB, for uploading anywhere.
- `output/webe-dair-bolum-02-preview.mp4`: a light 720p copy.

Script and storyboard: `../senaryo/bolum-02.md`. Captions for Instagram and TikTok: `../senaryo/paylasim-bolum-02.md`.

## Idea

The city from episode 1 is fully built: the sign, the building with its servers, and the road from the city gate. This episode adds the lock on the door.

- **HTTP:** data travels on the road as postcards. At the café's public Wi-Fi a magnifier reads one, and its lens shows "Şifre: 1234". The "GERÇEKTE" card shows the login form and what actually travels on the road: `sifre=1234`, in red.
- **HTTPS:** the postcards click shut into blue locked boxes. Matching keys light up at the browser (the gate) and at the server (the building). The magnifier grabs a box, and its lens shows only gibberish.
- **SSL certificate:** an ID card with a stamp from a trusted authority. The browser's three checks light up with the words (geçerli mi, bu adrese mi ait, süresi dolmuş mu?). Then the stamp flies to the door, the door closes, and a padlock clicks on.
- **Without a certificate:** the padlock comes off and the door turns red ("Güvenli değil"). Visitors walking up to the door turn around. In the search results, the secure site moves to the top.
- **The good news:** in the hosting panel, the SSL and auto-renew switches turn on. The padlock comes back with a spinning renewal ring. Two address bars compare the site without the lock and with it.
- **Closing:** the glossary card (HTTP = açık kartpostal, HTTPS = kilitli kutu, SSL = kimlik kartı) and "save". Then a mailbox is drawn for the next episode (kurumsal e-posta), followed by the end frame.

The chapter bar reads 01 HTTP · 02 HTTPS · 03 SSL. Section intros sit just under it, and term cards, captions and pins work as in episode 1.

## Files

- `scripts/vo_text.py`: the recording's text, with the spoken and captioned spelling side by side.
- `scripts/align.py`: word-level times → `src/cues.js`, `output/cues.json`.
- `src/timeline.js`: every beat, named after the word it lands on.
- `src/world.js`: episode 1's city (fully built), plus the café with Wi-Fi, the postcards and locked boxes, the magnifier, the door leaf, the padlock, the renewal ring and the visitors.
- `src/camera.js`, `src/overlay.js`, `src/style.css`: the camera moves and every 2D layer.
- `scripts/audio.py`: the music and sound design.
  - The bed changes to Am – F – C – G and drops out while the site has no lock.
  - Effects: locks click shut, keys, the stamp, the padlock, the visitors turning back, and the hosting panel switches.
  - It ends with the same sonic logo as episode 1.

The page is served from the project folder (`fentra-webe-dair/`), so it shares `node_modules/` and `assets/` with episode 1.

## Rendering

```bash
python3 scripts/align.py                     # voice → cues
node scripts/render.mjs --workers 2          # → output/_video.mp4 (~2.3 s per frame on 4 CPU cores)
python3 scripts/audio.py                     # → output/_audio.wav
python3 scripts/encode.py                    # → final, share copy, preview
node scripts/render.mjs --stills 33.8,76.5   # single frames → output/stills/
```
