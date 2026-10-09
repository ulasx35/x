"""Muxes output/_video.mp4 + output/_audio.wav -> output/webe-dair-<episode folder>.mp4, a <30 MB share copy and a light preview."""
import os, re, subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
FF = imageio_ffmpeg.get_ffmpeg_exe()
final = OUT / f"webe-dair-{ROOT.name}.mp4"
share = OUT / f"webe-dair-{ROOT.name}-paylasim.mp4"
preview = OUT / f"webe-dair-{ROOT.name}-preview.mp4"
ONLY = os.environ.get("ONLY")                       # ONLY=share re-encodes just the share copy
if not ONLY: subprocess.run([FF, "-y", "-v", "error", "-i", str(OUT / "_video.mp4"), "-i", str(OUT / "_audio.wav"),
                "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
                "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", "-movflags", "+faststart", str(final)], check=True)
# a full-resolution copy that fits a 30 MB upload limit: two-pass, video bitrate sized to the duration (28.5 MiB target)
info = subprocess.run([FF, "-i", str(final)], capture_output=True, text=True).stderr
h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info).groups()
dur = int(h) * 3600 + int(m) * 60 + float(sec)
vk = int(28.5 * 8 * 2**20 / 1000 / dur - 192 - 25)
log = str(OUT / "_x264pass")
common = ["-c:v", "libx264", "-preset", "slow", "-b:v", f"{vk}k", "-passlogfile", log]
subprocess.run([FF, "-y", "-v", "error", "-i", str(final), *common, "-pass", "1", "-an", "-f", "mp4", "/dev/null"], check=True)
subprocess.run([FF, "-y", "-v", "error", "-i", str(final), *common, "-pass", "2", "-profile:v", "high", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(share)], check=True)
if not ONLY: subprocess.run([FF, "-y", "-v", "error", "-i", str(final), "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
                "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(preview)], check=True)
for f in (final, share, preview): print(f"{f.name}: {f.stat().st_size / 2**20:.1f} MB")
