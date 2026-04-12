"""
将接近白色的背景转为透明，输出 assets/logo/hero-title.png（覆盖前请先备份）。
依赖: pip install pillow
用法: python scripts/knockout_white_bg.py [输入路径，默认 assets/logo/hero-title-source.png]
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("需要 Pillow: pip install pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IN = ROOT / "assets" / "logo" / "hero-title-source.png"
OUT = ROOT / "assets" / "logo" / "hero-title.png"
THRESH = 235


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    if not src.is_file():
        print(f"找不到输入文件: {src}")
        sys.exit(1)
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= THRESH and g >= THRESH and b >= THRESH:
                px[x, y] = (r, g, b, 0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG")
    print(f"已写入透明背景 PNG: {OUT}")


if __name__ == "__main__":
    main()
