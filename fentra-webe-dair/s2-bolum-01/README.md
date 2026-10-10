# WEB'E DAİR · Sezon 2 · Bölüm 1 — "Şehrin rehberi" (Google nasıl çalışır)

**Output:** `output/webe-dair-s2-bolum-01.mp4`, 1080×1920 (9:16), 30 fps, 112.7 s, H.264 + AAC, -14 LUFS.

- `output/webe-dair-s2-bolum-01-paylasim.mp4`: the same resolution under 30 MB.
- `output/webe-dair-s2-bolum-01-preview.mp4`: a light 720p copy.

Captions for Instagram and TikTok: `../senaryo/paylasim-s2-bolum-01.md`. Timed to the recorded voice (`assets/vo/s2-bolum-01.mp3`).

Script and storyboard: `../senaryo/s2-bolum-01.md`. Season plan: `../senaryo/sezon-2.md`.

Season 2 folders, voice files and videos are named `s2-bolum-NN`, so they never share a name with season 1's `bolum-NN`. The scripts derive every path from the folder name.

## Idea

The city of season 1 is kept, including the map pin on the roof. This episode adds the guide (Google): its tower with a record book on top (the index), a searchlight, link arcs between buildings with the crawlers that follow them, your site's other pages, and the avenue where the first page lives.

- **Hook:** a phone search for "en iyi diş kliniği". Ten results arrive in 0.41 seconds while a counter rolls up to a billion sites, then a question mark.
- **Bridge:** last season's pins light up ("SEZON 1 TAMAM"), then "Google'da öne çık" over your building.
- **The guide:** its tower rises floor by floor behind yours, the book on top opens, a searchlight sweeps the city and then three beams land on three addresses. A three-step strip follows: GEZ (Tarama) → KAYDET (Dizine ekleme) → SIRALA (Sıralama).
- **01 Gezgin:** crawlers leave the book. Glowing link arcs appear between roofs. The main crawler hops along them to your tower, scans it floor by floor, then visits /hizmetler and /iletisim.
  - /kampanya, at the front, is reached by no link and stays dark ("Bağlantı yok").
  - The "GERÇEKTE" card is a crawl log.
- **02 Defter:** your card rides the crawler into the book ("Deftere eklendi"). A search drops from the sky into the book only, while the city's windows go dark ("Sadece deftere bakar"). /kampanya gets "Defterde yok · Aramada çıkmaz", and the card shows the index report (3 indexed, 1 not).
- **03 Sıralama:** a "SIRA 9" badge sits on your pin.
  - It climbs 9 → 7 → 5 → 3 → 1 as the four criteria tick, and the results list on the card moves your row up.
  - From straight above, the avenue in front of your tower glows with arrows (1. sayfa). The back street behind is dark, with grey 11–15 badges ("Neredeyse kimse yok").
- **Check:** `site:websiteniz.com` is typed on the card and three results appear while the book's rows light up.
- **Closing:** the three steps light up as they are named, the route runs once more, and the SEO term card appears. Then the episode card (Tarama, Dizin, Sıralama, SEO) with save, the next episode (Müşterinin kelimeleri, anahtar kelimeler), and the end frame.

## Files and rendering

`src/world.js` is generated from episode 6's world by `make_world_s2e1.py`. It keeps the city at rest and adds the objects above. The block behind your tower (0, -56) is cleared for the guide's tower.

```bash
python3 scripts/align.py                       # voice → cues (provisional timeline until the MP3 exists)
node scripts/render.mjs --stills 30.2,44,72.9  # review stills → output/stills/
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until all chunks are done
python3 scripts/audio.py                       # → output/_audio.wav (refuses a recording the cues weren't aligned to)
python3 scripts/encode.py                      # → final, share copy, preview
```

For framing checks, `?cam=px,py,pz,qx,qy,qz,fov` pins the camera, for example `Q='?cam=-20,70,5,5,58,-60,42' node scripts/render.mjs --stills 86`.
