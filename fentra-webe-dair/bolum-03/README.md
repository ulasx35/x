# WEB'E DAİR · Bölüm 3 — "Kapınızdaki posta kutusu" (kurumsal e-posta, SPF, DKIM, DMARC)

**Output:** `output/webe-dair-bolum-03.mp4`, 1080×1920 (9:16), 30 fps, 102.4 s, H.264 + AAC, -14 LUFS.

- `output/webe-dair-bolum-03-paylasim.mp4`: the same resolution under 30 MB.
- `output/webe-dair-bolum-03-preview.mp4`: a light 720p copy.

Script and storyboard: `../senaryo/bolum-03.md`. Captions for Instagram and TikTok: `../senaryo/paylasim-bolum-03.md`. Season plan: `../senaryo/sezon-1.md`.

## Idea

The city from episodes 1 and 2 is kept as it is: the sign, the building, the road and the padlock on the door. This episode adds a mailbox in front of the door.

- **Hook:** a price offer arrives on the phone from a personal address. The `@gmail.com` part turns red, and a "Kişisel adres" tag and a question mark appear.
- **01 Adres:** the mailbox drops in on "Kurumsal e-posta". Its plate lights up as `bilgi@websiteniz.com` is said, and letters start arriving along the road. The "GERÇEKTE" card shows the e-mail header, then compares the personal address (✕) with the corporate one (✓).
- **Trust:** grey "free" mailboxes pop up in the park and one of them is a red fraudster's. They vanish on "Ama…", and your mailbox lights up as "SİZİN". The card shows a free account being opened in seconds, the owner-only `@websiteniz.com` panel, and a signature.
- **02 Mühür:** a fake, red letter comes down the road. The card adds the SPF, DKIM and DMARC rows to the DNS. A big seal fills its three rings and stamps itself on the letters; the sealed letters go into the mailbox and the fake one is thrown into the spam bin. Then your own unsealed offer lands in the customer's spam folder.
- **03 Kurulum:** the hosting panel's e-mail accounts are created on the words (satis@, muhasebe@, destek@), and three department mailboxes pop up next to yours. On "süresi dolarsa", the sign and the mailboxes go dark, the music drops out, and a delivery-failure message appears.
- **Closing:** the glossary card and "save", a queue drawn for the next episode (site speed), and the end frame.

## Files and rendering

The structure is the same as episode 2. `src/world.js` is episode 2's world (the café, packets and visitors are kept but hidden) plus the mailboxes, the letters, the free and fraudster boxes, and the spam bin. The street lamps right in front of the lot are removed so they don't glare into the close-ups.

```bash
python3 scripts/align.py                       # voice → cues
node scripts/render.mjs --chunked --workers 2  # resumable 100-frame chunks; run again until "chunks done 31/31"
python3 scripts/audio.py                       # → output/_audio.wav
python3 scripts/encode.py                      # → final, share copy, preview
```
