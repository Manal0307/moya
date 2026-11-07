"""Render every STL model's front preview with the smooth renderer.

Writes 1600 px PNG masters to renders/ (not public). Then run
scripts/optimize-previews.py to make the WebP versions the site serves.
Add a model here when you add its STL to private-files/.
"""
import math
import subprocess
import sys
from pathlib import Path

renderer = Path(__file__).with_name("render-stl-smooth.py")
# (name, source STL, rotation). The amulet file is modelled facing +X.
MODELS = [
    ("catstar", "private-files/catstar-test.stl", 0),
    ("bunny", next(Path("private-files/imports").glob("bunny-*.stl")), 0),
    ("kero", next(Path("private-files/imports").glob("kero-*.stl")), 0),
    ("kitty", next(Path("private-files/imports").glob("kitty-*.stl")), 0),
    ("amulet", next(Path("private-files/imports").glob("amulet-*.stl")), -math.pi / 2),
]
Path("renders").mkdir(exist_ok=True)
for name, source, angle in MODELS:
    subprocess.run(
        [sys.executable, str(renderer), str(source), f"renders/{name}.png", str(angle), "1600"],
        check=True,
    )
