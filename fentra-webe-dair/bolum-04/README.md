# WEB'E DAİR · Bölüm 4 — "Kapınızdaki kuyruk" (site hızı: görseller, hosting, CDN, hız testi)

**Output:** `output/webe-dair-bolum-04.mp4`, 1080×1920 (9:16), 30 fps, 116.5 s, H.264 + AAC, -14 LUFS.

- `output/webe-dair-bolum-04-paylasim.mp4`: the same resolution under 30 MB.
- `output/webe-dair-bolum-04-preview.mp4`: a light 720p copy.

Captions for Instagram and TikTok: `../senaryo/paylasim-bolum-04.md`.

`scripts/align.py` predicts a provisional timeline from the script's syllables while `assets/vo/bolum-04.mp3` is missing. This let the visuals be built before the recording, and they were then re-timed to the real voice.

Script and storyboard: `../senaryo/bolum-04.md`. Season plan: `../senaryo/sezon-1.md`.

## Idea

The city from episodes 1–3 is kept: the sign, the building, the road, the padlock and the mailboxes. This episode adds a queue at the door.

- **Hook:** an ad on the phone is tapped, and the page stays white. A timer counts up and turns red after 3 seconds, then a question mark appears.
- **01 Kuyruk:** people line up out of the door and across the square. The "GERÇEKTE" card shows 100 visitors and a waiting bar. When it passes 3 seconds, 53 of them turn red, and the matching people in the queue turn red and disappear. New visitors refill the queue, and the last three walk off to the shop next door ("DÜKKAN"). The card then shows a search result where the fast site moves above the slow one.
- **02 Sebepler:** a huge "6,4 MB" photo crate drops onto the long street and crawls, with the page's data boxes stuck behind it. On "küçültülüp sıkıştırılınca" it squashes into a green "180 KB" box, and everything rushes to the door. The card shows the file, the page weight and the load time shrinking. Then site plates of other businesses fill the building ("312 site · tek sunucu"), the server lights blink red, and the card shows a crowded shared server. On "geniş" a wide glowing door frame opens, and the queue walks straight in.
- **03 Çözüm:** a wide shot of the city. A far-away visitor's long orange road leads to the building. Branches of the site rise floor by floor in four corners of the city, and each visitor gets a short blue road to the nearest branch.
- **Speed test:** a gauge appears over the door. The card types `websiteniz.com`, scores 42 and lists the three causes. These tick off one by one, and the score rises to 94.
- **Closing:** the glossary card and "save", a safe and a key drawn for the next episode (backups), and the end frame.

## Files and rendering

The structure is the same as episode 3. `src/world.js` is episode 3's world with the mailbox and department boxes kept, plus the queue, the shop, the crate and its data boxes, the site plates, the wide door frame, the branches and far-away visitors, and the gauge.

```bash
python3 scripts/align.py                       # voice → cues (provisional timeline until the MP3 exists)
node scripts/render.mjs --stills 24.5,44,67.5  # review stills → output/stills/
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until all chunks are done
python3 scripts/audio.py                       # → output/_audio.wav
python3 scripts/encode.py                      # → final, share copy, preview
```
