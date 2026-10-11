# WEB'E DAİR · Sezon 2 · Bölüm 2 — "Müşterinin kelimeleri" (anahtar kelimeler)

**Output:** `output/webe-dair-s2-bolum-02.mp4`, 1080×1920 (9:16), 30 fps, 117.3 s, H.264 + AAC, -14 LUFS.

- `output/webe-dair-s2-bolum-02-paylasim.mp4`: the same resolution under 30 MB.
- `output/webe-dair-s2-bolum-02-preview.mp4`: a light 720p copy.

Captions for Instagram and TikTok: `../senaryo/paylasim-s2-bolum-02.md`. Timed to the recorded voice (`assets/vo/s2-bolum-02.mp3`).

Script and storyboard: `../senaryo/s2-bolum-02.md`. Season plan: `../senaryo/sezon-2.md`.

## Idea

The city of season 1 and the guide of episode 1 are kept: the guide's tower with its open record book, and your site's page buildings. This episode adds the words on signs.

- **Hook:** a phone shows your site ("Kurumsal Lojistik Çözümleri") above and the customer's search ("evden eve nakliyat") below. The results don't include you, and a red "≠" sits between the two.
- **Bridge:** the guide's tower and book, then down to the new banner over your door: "Kurumsal lojistik çözümleri".
- **01 Kelime:** someone on the square searches "evden eve nakliyat". The words fly into the book, and the guide's light lands on the shop next door, whose banner says exactly that ("Eşleşti"). Your banner gets "Eşleşmedi".
  - Your banner switches to "Evden eve nakliyat", the light lands on you too ("Şimdi eşleşti"), and the card translates industry words into the customer's (lojistik çözümleri → evden eve nakliyat, implant → eksik diş tedavisi).
- **02 Araştırma:**
  - The card types "nakliyat" and shows the search suggestions, then related searches.
  - At your door, "Bizi nasıl aradınız?"; three customers walk out with their answers.
  - Long searches: five rival "NAKLİYAT" signs and a browsing crowd ("Sadece bakıyor") west of your tower. Three people carrying moving boxes walk from the park to your door with the long search above them ("Taşınmak üzere"). The card compares the two searches.
- **03 Sayfa:**
  - Your page buildings get their names (/evden-eve-nakliyat, /ofis-tasima, /esya-depolama, "1 SAYFA = 1 KONU").
  - The card shows the word in the title, the first sentence and the text.
  - Then your banner fills with "nakliyat nakliyat nakliyat…", flashes red and gets caught ("Rehber fark etti", "Kelime doldurma: işe yaramaz").
- **Closing:** the light lands on your banner and pages ("Anahtar kelime = müşterinin dili"). Then the episode card, the next episode (Vitrindeki yazı: title and description), and the end frame.

## Files and rendering

`src/world.js` is generated from episode 1's world by `make_world_s2e2.py`. It keeps the guide's tower, the book and the pages at rest, and adds the banners, the rival signs, the crowd, the movers and the customers.

```bash
python3 scripts/align.py                       # voice → cues (provisional timeline until the MP3 exists)
node scripts/render.mjs --stills 30.5,41.8,73.5 # review stills → output/stills/
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until all chunks are done
python3 scripts/audio.py                       # → output/_audio.wav (refuses a recording the cues weren't aligned to)
python3 scripts/encode.py                      # → final, share copy, preview
```
