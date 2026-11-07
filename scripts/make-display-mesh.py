"""Build a reduced, display-only mesh for the real-time 3D hero.

The browser needs geometry to render in real time, so this never ships the STL
being sold. Instead it:
  1. simplifies the model by vertex clustering (vertices are snapped to a grid
     and merged), which drops fine detail and roughly halves the triangle count;
  2. quantises positions to 16 bits and indexes them;
  3. writes a small custom binary (.mesh), not a print-ready STL.

Format (little endian):
  b"STLM", u32 vertex_count, u32 triangle_count, f32[3] min, f32[3] max,
  u16[vertex_count*3] positions quantised over [min, max],
  u32[triangle_count*3] indices

usage: make-display-mesh.py source.stl target.mesh [grid]
  grid = cells along the longest side (lower = coarser), default 90;
         0 keeps every triangle and only welds shared vertices
"""
import struct
import sys
from pathlib import Path

source, target = Path(sys.argv[1]), Path(sys.argv[2])
grid = int(sys.argv[3]) if len(sys.argv) > 3 else 90

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
cell = max(high[k] - low[k] for k in range(3)) / grid if grid > 0 else 0.0

# Cluster: every vertex in a cell becomes the average of that cell's vertices.
# With grid 0 the "cell" is the exact position, so only shared vertices weld.
sums: dict[tuple, list] = {}
def cell_of(v):
    if not cell:
        return v
    return tuple(int((v[k] - low[k]) / cell) for k in range(3))
for t in tris:
    for v in t:
        c = cell_of(v)
        s = sums.setdefault(c, [0.0, 0.0, 0.0, 0])
        s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; s[3] += 1

index_of: dict[tuple, int] = {}
verts = []
for c, s in sums.items():
    index_of[c] = len(verts)
    verts.append((s[0] / s[3], s[1] / s[3], s[2] / s[3]))

faces = set()
out = []
for t in tris:
    a, b, c = (index_of[cell_of(v)] for v in t)
    if a == b or b == c or a == c:
        continue  # collapsed by clustering
    key = tuple(sorted((a, b, c)))
    if key in faces:
        continue
    faces.add(key)
    out.append((a, b, c))

vlow = [min(v[k] for v in verts) for k in range(3)]
vhigh = [max(v[k] for v in verts) for k in range(3)]
span = [(vhigh[k] - vlow[k]) or 1.0 for k in range(3)]
quant = [
    tuple(round((v[k] - vlow[k]) / span[k] * 65535) for k in range(3)) for v in verts
]

blob = bytearray(b"STLM")
blob += struct.pack("<II", len(verts), len(out))
blob += struct.pack("<3f", *vlow) + struct.pack("<3f", *vhigh)
for q in quant:
    blob += struct.pack("<3H", *q)
for f in out:
    blob += struct.pack("<3I", *f)
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(bytes(blob))
print(f"{count} -> {len(out)} triangles, {len(verts)} vertices, {round(len(blob) / 1024)} KiB")
