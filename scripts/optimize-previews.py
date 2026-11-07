"""Make the web versions of every smooth render.

The 1600 px PNG masters live in renders/ (never served). Visitors get WebP in
public/previews/smooth:
  <name>-480.webp   cards (shop, home, cart)
  <name>-1200.webp  product page and the home poster
Run after any render: python3 scripts/optimize-previews.py
"""
from pathlib import Path

from PIL import Image

SIZES = (480, 1200)
masters = Path("renders")
folder = Path("public/previews/smooth")
folder.mkdir(parents=True, exist_ok=True)
total_in = total_out = 0
for master in sorted(masters.glob("*.png")):
    image = Image.open(master).convert("RGBA")
    total_in += master.stat().st_size
    for size in SIZES:
        target = folder / f"{master.stem}-{size}.webp"
        image.resize((size, size), Image.LANCZOS).save(target, "WEBP", quality=86, method=6)
        total_out += target.stat().st_size
        print(f"{target.name} {round(target.stat().st_size / 1024)} KiB")
print(f"masters {round(total_in / 1024)} KiB -> web {round(total_out / 1024)} KiB")
