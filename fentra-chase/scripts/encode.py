"""Encodes the delivery film and a lightweight preview, muxing output/_video.mp4 + output/_audio.wav.

  output/fentra-gorunur.mp4          1080x1920, 24 fps, H.264 High (≈9 Mbps cap), AAC 320k — for Reels / TikTok
  output/fentra-gorunur-preview.mp4  same picture at a lower bitrate for quick sharing
"""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

OUT = Path(__file__).resolve().parent.parent / "output"
ff = imageio_ffmpeg.get_ffmpeg_exe()
dur = json.loads((OUT / "cues.json").read_text())["duration"]
common = ["-map", "0:v:0", "-map", "1:a:0", "-pix_fmt", "yuv420p", "-profile:v", "high",
          "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
          "-ar", "48000", "-t", f"{dur:.3f}", "-movflags", "+faststart"]
for name, v, a in [
    ("fentra-gorunur.mp4", ["-c:v", "libx264", "-preset", "slow", "-tune", "film", "-crf", "18", "-maxrate", "9M", "-bufsize", "18M"], ["-c:a", "aac", "-b:a", "320k"]),
    ("fentra-gorunur-preview.mp4", ["-c:v", "libx264", "-preset", "slow", "-tune", "film", "-crf", "23", "-maxrate", "2.2M", "-bufsize", "4.4M"], ["-c:a", "aac", "-b:a", "160k"]),
]:
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(OUT / "_video.mp4"), "-i", str(OUT / "_audio.wav"), *common, *v, *a, str(OUT / name)], check=True)
    print("wrote", OUT / name, f"{(OUT / name).stat().st_size / 1e6:.1f} MB")
