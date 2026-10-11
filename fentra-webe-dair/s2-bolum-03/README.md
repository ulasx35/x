# WEB'E DAİR · Sezon 2 · Bölüm 3 — "Vitrindeki yazı" (sayfa başlığı ve açıklama)

**Output:** `output/webe-dair-s2-bolum-03.mp4`, 1080×1920 (9:16), 30 fps, 108.5 s, H.264 + AAC, -14 LUFS.

- `output/webe-dair-s2-bolum-03-paylasim.mp4`: the same resolution under 30 MB.
- `output/webe-dair-s2-bolum-03-preview.mp4`: a light 720p copy.

Captions for Instagram and TikTok: `../senaryo/paylasim-s2-bolum-03.md`. Timed to the recorded voice (`assets/vo/s2-bolum-03.mp3`).

Script and storyboard: `../senaryo/s2-bolum-03.md`. Season plan: `../senaryo/sezon-2.md`.

## Idea

The city of season 1, the guide of episode 1 and the banners of episode 2 are kept. This episode adds shop windows: a lit board on your tower that shows your search result (a blue title and a short description), four rival boards on the avenue's sidewalk, and people walking past them.

- **Hook:** a phone shows the results for "evden eve nakliyat", each with its two lines. A finger taps one. Yours only says "Anasayfa", and a "?" appears.
- **Bridge:** the rival boards light up one by one along the sidewalk, then the camera finds yours ("VİTRİNİNİZ").
- **01 Vitrin:** the GERÇEKTE card labels a result's two lines as BAŞLIK and AÇIKLAMA ("Bu iki satır = vitrininiz"). People on the sidewalk only look at the boards.
- **"Anasayfa":** up close, your board says "Anasayfa" with an empty note ("Açıklama boş", then "Rastgele cümle"), and people walk past ("Önünden geçti").
- **02 Başlık:**
  - "NE: Evden eve nakliyat" and "NEREDE: Karşıyaka" appear, and the board switches to "Karşıyaka'da Evden Eve Nakliyat, Sigortalı ve Asansörlü" ("Önemli kelime başta").
  - A ruler under the board counts to 54 of 60 characters. A longer title runs past 60 and gets cut ("Sonu kesildi…").
- **03 Açıklama:**
  - The note is written, and its three reasons light up (ücretsiz keşif, aynı gün taşıma, tek telefonla randevu, "~150 karakter").
  - For a moment the board shows a note Google picked itself ("Çerez politikası · Giriş yap…"), then yours comes back ("Sizin notunuz gösterildi").
  - Two people stop at your board and go in.
- **Pages:** your page buildings get their own title tags. The card shows the admin panel's "Sayfa ayarları" with the title and description being typed, and a preview.
- **Closing:** people stop at your board ("Başlık durdurur") and go in ("Açıklama davet eder"). Then the episode card, the next episode (Dükkanın içi: content), and the end frame.

## Files and rendering

`src/world.js` is generated from episode 2's world by `make_world_s2e3.py`. It keeps the guide's tower, the book, the banners and the page buildings, moves the backup cloud aside, and adds the boards and the people on the sidewalk.

```bash
python3 scripts/align.py                       # voice → cues
node scripts/render.mjs --stills 36,58,76.5    # review stills → output/stills/
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until all chunks are done
python3 scripts/audio.py                       # → output/_audio.wav (refuses a recording the cues weren't aligned to)
python3 scripts/encode.py                      # → final, share copy, preview
```
