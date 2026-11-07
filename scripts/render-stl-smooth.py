"""Smooth, anti-aliased preview of a binary STL, for hero-sized images.

Unlike flat shading (one tone per triangle), this averages
the normals of neighbouring triangles (except across sharp creases) and
interpolates them per pixel (Phong shading), so low-poly facets read as one
continuous surface while hard edges stay crisp. Lighting is a
soft key, a fill and a rim light with a faint satin highlight on matte white.
The image is rendered at 2x and downsampled for clean edges.

usage: render-stl-smooth.py source.stl target.png [angle] [size] [fill]

fill is the share of the frame the largest dimension spans (default 0.69).
"""
import math
import struct
import sys
from pathlib import Path

from PIL import Image

source, target = map(Path, sys.argv[1:3])
angle = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
size = int(sys.argv[4]) if len(sys.argv) > 4 else 1200
fill = float(sys.argv[5]) if len(sys.argv) > 5 else 0.69
SS = 2  # supersampling factor
W = size * SS

data = source.read_bytes()
count = struct.unpack_from("<I", data, 80)[0]
if len(data) != 84 + 50 * count:
    raise ValueError("Binary STL required")
tris = [
    [struct.unpack_from("<3f", data, 84 + i * 50 + 12 + j * 12) for j in range(3)]
    for i in range(count)
]

low = [min(v[k] for t in tris for v in t) for k in range(3)]
high = [max(v[k] for t in tris for v in t) for k in range(3)]
center = [(low[k] + high[k]) / 2 for k in range(3)]
scale = W * fill / max(high[k] - low[k] for k in range(3))
ca, sa = math.cos(angle), math.sin(angle)


def project(p):
    """Front three-quarter camera, shared by every render so framing matches."""
    x, y, z = (p[k] - center[k] for k in range(3))
    X = x * ca - y * sa
    Y = x * sa + y * ca
    return (W / 2 + X * scale, W / 2 - (z * 0.98 - Y * 0.18) * scale, (-Y * 0.98 - z * 0.18) * scale)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def norm(v):
    length = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) or 1.0
    return (v[0] / length, v[1] / length, v[2] / length)


# Project once, then build crease-aware vertex normals: at each corner, average
# only the neighbouring faces within CREASE of this face. Gentle curves shade
# smoothly while sharp edges (eye rims, mouths, ear cut-outs) stay crisp instead
# of smearing the light across them.
CREASE = math.cos(math.radians(32))
proj = [[project(v) for v in t] for t in tris]
key = lambda p: (round(p[0], 2), round(p[1], 2), round(p[2], 2))
faces = []
units = []
around: dict[tuple, list] = {}
for i, t in enumerate(proj):
    n = cross(sub(t[1], t[0]), sub(t[2], t[0]))  # area-weighted
    faces.append(n)
    units.append(norm(n))
    for v in t:
        around.setdefault(key(v), []).append(i)


def corner_normal(i, k):
    u = units[i]
    sx = sy = sz = 0.0
    for j in around[k]:
        w = units[j]
        if u[0] * w[0] + u[1] * w[1] + u[2] * w[2] >= CREASE:
            f = faces[j]
            sx += f[0]; sy += f[1]; sz += f[2]
    return norm((sx, sy, sz))

# Screen space: +x right, +y down, +z towards the viewer.
KEY = norm((-0.45, -0.6, 0.66))
FILL = norm((0.7, -0.1, 0.5))
RIM = norm((0.2, 0.9, -0.3))
HALF = norm((KEY[0], KEY[1], KEY[2] + 1))
BASE = (247, 245, 244)

depth = [-1e18] * (W * W)
pix = bytearray(W * W * 4)

for i, (t, fn) in enumerate(zip(proj, faces)):
    a, b, c = t
    na, nb, nc = (corner_normal(i, key(v)) for v in t)
    # Orient vertex normals with the face so back-facing winding cannot flip them.
    flip = -1 if fn[2] < 0 else 1
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-9:
        continue
    x0 = max(0, int(min(a[0], b[0], c[0])))
    x1 = min(W - 1, int(max(a[0], b[0], c[0])) + 1)
    y0 = max(0, int(min(a[1], b[1], c[1])))
    y1 = min(W - 1, int(max(a[1], b[1], c[1])) + 1)
    for y in range(y0, y1 + 1):
        py = y + 0.5
        for x in range(x0, x1 + 1):
            px = x + 0.5
            u = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den
            v = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den
            w = 1 - u - v
            if u < 0 or v < 0 or w < 0:
                continue
            d = u * a[2] + v * b[2] + w * c[2]
            i = y * W + x
            if d <= depth[i]:
                continue
            depth[i] = d
            nx = (u * na[0] + v * nb[0] + w * nc[0]) * flip
            ny = (u * na[1] + v * nb[1] + w * nc[1]) * flip
            nz = (u * na[2] + v * nb[2] + w * nc[2]) * flip
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nx, ny, nz = nx / ln, ny / ln, nz / ln
            if nz < 0:
                nx, ny, nz = -nx, -ny, -nz
            key_l = max(0.0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2])
            fill_l = max(0.0, nx * FILL[0] + ny * FILL[1] + nz * FILL[2])
            rim_l = max(0.0, nx * RIM[0] + ny * RIM[1] + nz * RIM[2])
            spec = max(0.0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]) ** 40
            light = 0.52 + 0.44 * key_l + 0.12 * fill_l + 0.08 * rim_l
            shade = [min(255, int(ch * light + 255 * 0.16 * spec)) for ch in BASE]
            o = i * 4
            pix[o : o + 4] = bytes((shade[0], shade[1], shade[2], 255))

img = Image.frombytes("RGBA", (W, W), bytes(pix))
img = img.resize((size, size), Image.LANCZOS)
img.save(target, optimize=True)
print(target.name, size, "px", round(target.stat().st_size / 1024), "KiB")
