# WEB'E DAİR · Bölüm 5 — "Yedek anahtar" (yedekleme ve güncellemeler)

**Status:** aligned to the recorded voice-over (`assets/vo/bolum-05.mp3`, 106.4 s; the film runs 109.4 s). The visuals were built first on a provisional timeline predicted from the script.

Script and storyboard: `../senaryo/bolum-05.md`. Season plan: `../senaryo/sezon-1.md`.

## Idea

The city from episodes 1–4 is kept: the sign, the building, the road, the lock and the wide door, the mailboxes, the shop next door and the CDN branches. This episode adds a safe with the spare key.

- **Hook:** a site on the phone empties out piece by piece (hero image, products, text) until only "Sayfa bulunamadı" is left, then a question mark appears.
- **Bridge:** pins for everything built so far; people walk straight in ("Kuyruk yok"). On "çökerse" the building shakes and its windows turn red.
- **01 Çöküş:** the "GERÇEKTE" card lists four causes, and each one happens in the city:
  - the servers spark and blink red;
  - a bad update knocks a floor sideways;
  - a dark figure slips in through the door;
  - a deleted file wipes out a floor.

  Then the building collapses floor by floor into rubble.
- **02 Yedek:** a safe rises in front of the rubble and opens. It holds a wireframe copy of the building ("Dosyalar · Görseller · Veritabanı") and a golden spare key. On "geri yükler" a beam runs from the safe and the building rises again floor by floor, while the card restores the latest backup.
  - "Not in the same building": a ghost safe in the lobby turns red as the building glows with fire. A second safe rises on a cloud, and a copy flies up to it.
  - Daily backups: a clock turns over the safe, and copies fly in from the building. The tested golden key opens the lock (green, "Çalışıyor"). An untested grey key doesn't fit (red, "Uymadı").
- **03 Güncelleme:** the lock rusts ("Eski kilit · v1.2"), and dark attackers come to try it. On "önce yedek alın" a backup is taken first, the lock is replaced by a new one, and the attackers leave. The hosting panel then answers the three questions: is there a backup, how often, and where.
- **Closing:** the glossary card and "save", a map and pin drawn for the next episode (Google İşletme Profili), and the end frame.

## Files and rendering

The structure is the same as episode 4. `src/world.js` is episode 4's world (the queue, crate and site plates hidden; the branches kept) plus the safes, the cloud, the keys, the clock, the rubble, the beams, the attackers and the fire glow.

```bash
python3 scripts/align.py                       # voice → cues (provisional timeline until the MP3 exists)
node scripts/render.mjs --stills 26.5,33.1,46.6 # review stills → output/stills/
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until all chunks are done
python3 scripts/audio.py                       # → output/_audio.wav
python3 scripts/encode.py                      # → final, share copy, preview
```
