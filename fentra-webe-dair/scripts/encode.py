"""Muxes output/_video.mp4 + output/_audio.wav -> output/webe-dair-bolum-01.mp4 (+ a light preview)."""
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "output"
FF = imageio_ffmpeg.get_ffmpeg_exe()
final, preview = OUT / "webe-dair-bolum-01.mp4", OUT / "webe-dair-bolum-01-preview.mp4"
subprocess.run([FF, "-y", "-i", str(OUT / "_video.mp4"), "-i", str(OUT / "_audio.wav"),
                "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
                "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", "-movflags", "+faststart", str(final)], check=True)
subprocess.run([FF, "-y", "-i", str(final), "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
                "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(preview)], check=True)
print("wrote", final, "and", preview)
