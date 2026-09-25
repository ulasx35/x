"""Muxes output/_video.mp4 + output/_audio.wav -> output/fentra-brand-film.mp4 (exactly 20.000 s)."""
import subprocess
from pathlib import Path

import imageio_ffmpeg

OUT = Path(__file__).resolve().parent.parent / "output"
ff = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([
    ff, "-y", "-loglevel", "error",
    "-i", str(OUT / "_video.mp4"), "-i", str(OUT / "_audio.wav"),
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
    "-t", "20", "-movflags", "+faststart",
    str(OUT / "fentra-brand-film.mp4"),
], check=True)
print("wrote", OUT / "fentra-brand-film.mp4")
