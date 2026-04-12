"""Knock out near-white background, trim margins, save transparent PNG."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "branding" / "logo_source.png"
OUT = ROOT / "assets" / "branding" / "dream_echo_logo_clean.png"
# 背景：高亮近白像素透明；可按原图微调
WHITE = 248
MARGIN_PAD = 2


def main() -> None:
    if not SRC.is_file():
        print(f"Missing: {SRC}", file=sys.stderr)
        sys.exit(1)
    img = Image.open(SRC).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE and g >= WHITE and b >= WHITE:
                px[x, y] = (r, g, b, 0)
    bbox = img.getbbox()
    if bbox:
        l, t, r, b = bbox
        l = max(0, l - MARGIN_PAD)
        t = max(0, t - MARGIN_PAD)
        r = min(w, r + MARGIN_PAD)
        b = min(h, b + MARGIN_PAD)
        img = img.crop((l, t, r, b))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} size={img.size}")


if __name__ == "__main__":
    main()
