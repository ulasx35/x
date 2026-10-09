# WEB'E DAİR · Bölüm 6 — "Haritadaki yeriniz" (Google İşletme Profili, sezon finali)

**Output:** `output/webe-dair-bolum-06.mp4`, 1080×1920 (9:16), 30 fps, H.264 + AAC, -14 LUFS.

- `output/webe-dair-bolum-06-paylasim.mp4`: the same resolution under 30 MB.
- `output/webe-dair-bolum-06-preview.mp4`: a light 720p copy.

The visuals are built on a provisional timeline predicted from the script (about 106 s). They are re-timed to the recorded voice once `assets/vo/bolum-06.mp3` exists.

Script and storyboard: `../senaryo/bolum-06.md`. Season plan: `../senaryo/sezon-1.md`.

## Idea

The city from episodes 1–5 is kept: the sign, the building, the road, the lock and the wide door, the mailboxes, the shop next door, the CDN branches and the safes. This episode adds map pins: your business profile is your pin on the map.

- **Hook:** a phone map app. Someone types "yakınımdaki kuaför", three pins drop, and three businesses appear with stars and "Yol tarifi". Your business ("Websiteniz") is not on the map, and a question mark appears.
- **Bridge:** pins for everything built so far, with people walking straight in. On "Ama" the camera rises until the city reads as a map: red pins drop on other businesses, each with a rating, and your building has none ("Siz neredesiniz?").
- **01 Kart:** a big blue pin lands on your building. The "GERÇEKTE" card is a business profile that fills in word by word: address, hours, phone, photos, reviews.
  - On the square, people decide on their phones while the card shows a search where the shop next door is first and you are missing.
  - On "görünmez" your pin vanishes and the building greys out ("Haritada yok").
  - On "yan dükkana gider" the people walk to the shop with the red pin.
- **02 Kurulum:** the card shows "İşletmenizi ekleyin" with a verification code. On "doğrularsınız" the pin comes back with a check mark and the building lights up again. The profile fills from 40% to 100% (address, hours, phone, website). Then "Site · Harita · Rehber" show the same address.
- **03 Güven:** customers leave through the door and stop in an arc, each with a review bubble. The two-star one turns red, gets a calm reply ("Cevap verildi") and settles. The pin brightens and more people come.
  - Holiday hours: a "KAPALI" sign goes up on the door. The card adds "Bayram · Kapalı". Someone who trusted the old hours finds the door closed and turns back ("Kapıda kaldı").
- **Closing:** your pin ("İşletme profili = haritadaki iğneniz"). The camera rises over the city as the whole season lights up pin by pin (address, building, road, lock, mailbox, speed, backup, pin) into "SEZON 1 TAMAM". Then the season glossary card (eight rows) with "save" and a "SEZON 1 ✓" stamp, the next season teaser (Google'da üst sıralar · SEO), and the end frame.

## Files and rendering

The structure is the same as episode 5. `src/world.js` is generated from episode 5's world by `make_world6.py`. It keeps the city at rest (the safes stay) and adds the pins, the people searching on their phones, the reviewers, the closed sign and the visitor. `scripts/audio.py`, `scripts/encode.py` and `scripts/render.mjs` derive the voice file and output names from the folder name, and `audio.py` refuses a recording whose length doesn't match the one the cues were aligned to.

```bash
python3 scripts/align.py                       # voice → cues (provisional timeline until the MP3 exists)
node scripts/render.mjs --stills 23,39,44.8    # review stills → output/stills/
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until all chunks are done
python3 scripts/audio.py                       # → output/_audio.wav
python3 scripts/encode.py                      # → final, share copy, preview
```

For framing checks, `?cam=px,py,pz,qx,qy,qz,fov` pins the camera, for example `Q='?cam=-5,22,58,2.5,3,22,42' node scripts/render.mjs --stills 39`.
