"""Build index.html from src.html: draws the dotted world map into it.

The land comes from the contributor map's own geometry (Arrow-air/website,
src/data/world-map-geometry.json: Natural Earth countries, already projected
to a 960 x 500 Natural Earth I canvas), so people's dots land where Gavin's
map puts them.

    git -C ../website show origin/main:src/data/world-map-geometry.json > /tmp/geo.json
    python3 tools/build.py /tmp/geo.json
"""
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent.parent
SCALE = 2          # rasterise at twice the canvas size so small islands survive
SPACING = 6.0      # dot pitch in canvas pixels
RADIUS = 1.45


def polygons(d):
    polys, cur = [], []
    for cmd, args in re.findall(r"([MLZ])([^MLZ]*)", d):
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", args)]
        pts = list(zip(nums[0::2], nums[1::2]))
        if cmd == "M":
            if len(cur) > 2:
                polys.append(cur)
            cur = pts
        elif cmd == "L":
            cur.extend(pts)
        elif cmd == "Z":
            if len(cur) > 2:
                polys.append(cur)
            cur = []
    if len(cur) > 2:
        polys.append(cur)
    return polys


def main(geo_path):
    geo = json.loads(Path(geo_path).read_text())
    w, h = geo["width"], geo["height"]
    img = Image.new("L", (w * SCALE, h * SCALE), 0)
    draw = ImageDraw.Draw(img)
    for country in geo["countries"]:
        if country["name"] == "Antarctica":
            continue
        for poly in polygons(country["d"]):
            draw.polygon([(x * SCALE, y * SCALE) for x, y in poly], fill=255)
    px = img.load()
    dots = []
    row_h = SPACING * math.sqrt(3) / 2
    y, row = SPACING / 2, 0
    while y < h:
        x = SPACING / 2 + (SPACING / 2 if row % 2 else 0)
        while x < w:
            if px[int(x * SCALE), int(y * SCALE)]:
                dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{RADIUS}"/>')
            x += SPACING
        y += row_h
        row += 1
    src = (HERE / "src.html").read_text()
    out = src.replace("<!--MAP_DOTS-->", "".join(dots))
    (HERE / "index.html").write_text(out)
    print(f"{len(dots)} land dots; index.html {len(out) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
