"""
Bake local PNG/WebP-style assets for Hero + wet glass (not runtime CSS gradients).
Also download PD Rider–Waite tarot via Commons Special:FilePath, and emit soft-edge logo.
"""
from __future__ import annotations

import math
import random
import shutil
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FX = ROOT / "assets" / "fx"
BR = ROOT / "assets" / "branding"
TAROT = ROOT / "assets" / "tarot"
UA = "Mozilla/5.0 (compatible; DreamEcho-Showcase/1.0; +https://example.local)"


def ensure_dirs() -> None:
    FX.mkdir(parents=True, exist_ok=True)
    (FX / "clouds").mkdir(parents=True, exist_ok=True)
    (FX / "fog").mkdir(parents=True, exist_ok=True)
    (FX / "raindrops").mkdir(parents=True, exist_ok=True)
    TAROT.mkdir(parents=True, exist_ok=True)
    BR.mkdir(parents=True, exist_ok=True)


def sync_fx_layout() -> None:
    """Mirror flat outputs into assets/fx/clouds|fog|raindrops for site-relative URLs."""
    mapping = [
        (FX / "hero_cloud_far.png", FX / "clouds" / "cloud_far.png"),
        (FX / "hero_cloud_mid.png", FX / "clouds" / "cloud_mid.png"),
        (FX / "hero_cloud_near.png", FX / "clouds" / "cloud_near.png"),
        (FX / "hero_vignette.png", FX / "clouds" / "vignette.png"),
        (FX / "hero_lightning_flash.png", FX / "clouds" / "lightning_glow.png"),
        (FX / "hero_fog_a.png", FX / "fog" / "fog_a.png"),
        (FX / "hero_fog_b.png", FX / "fog" / "fog_b.png"),
        (FX / "glass_distort.png", FX / "raindrops" / "glass_frost.png"),
        (FX / "glass_streaks.png", FX / "raindrops" / "streak_ref.png"),
        (FX / "glass_drops.png", FX / "raindrops" / "drop_ref.png"),
    ]
    for src, dest in mapping:
        if src.is_file():
            shutil.copy2(src, dest)
            print(f"Synced {dest.relative_to(ROOT)}")


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())
    print(f"Downloaded {dest.name} ({dest.stat().st_size} bytes)")


def storm_cloud(w: int, h: int, seed: int, blur: int, contrast: float) -> Image.Image:
    rnd = random.Random(seed)
    base = Image.effect_noise((w, h), max(8, min(w, h) // 64))
    base = ImageOps.autocontrast(base)
    c = contrast
    base = base.point(lambda p, _c=c: int(max(0, min(255, ((p / 255.0) - 0.5) * _c + 0.5) * 255)))
    im = base.filter(ImageFilter.GaussianBlur(blur))
    # tint to cold storm
    colored = Image.new("RGBA", (w, h))
    cp = colored.load()
    ip = im.load()
    for y in range(h):
        for x in range(w):
            t = ip[x, y] / 255.0
            # dark blue-gray clouds
            r = int(8 + t * 42 + rnd.random() * 3)
            g = int(12 + t * 52 + rnd.random() * 3)
            b = int(18 + t * 68 + rnd.random() * 4)
            a = int(40 + t * 200)
            cp[x, y] = (r, g, b, a)
    return colored


def edge_vignette(w: int, h: int) -> Image.Image:
    """Dark transparent edges (multiply in CSS over cloud stack)."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    cx, cy = w * 0.5, h * 0.42
    max_r = math.hypot(w, h) * 0.52
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max_r
            a = int(min(255, (d**1.35) * 320))
            px[x, y] = (0, 0, 0, a)
    return im.filter(ImageFilter.GaussianBlur(88))


def fog_sheet(w: int, h: int, seed: int, spread: int) -> Image.Image:
    n = Image.effect_noise((w // 2, h // 2), 40)
    n = n.resize((w, h), Image.Resampling.BILINEAR)
    n = ImageOps.autocontrast(n.filter(ImageFilter.GaussianBlur(spread)))
    out = Image.new("RGBA", (w, h))
    op = out.load()
    np = n.load()
    for y in range(h):
        for x in range(w):
            t = np[x, y] / 255.0
            # silvery fog
            v = int(140 + t * 90)
            a = int(25 + t * 120)
            op[x, y] = (v, v, int(v * 1.05), a)
    return out.filter(ImageFilter.GaussianBlur(12))


def lightning_flash_png(w: int, h: int) -> Image.Image:
    """Soft screen-blend burst for JS opacity animation."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(g)
    # upper-center glow
    draw.ellipse((-w * 0.1, -h * 0.35, w * 1.1, h * 0.55), fill=220)
    draw.ellipse((w * 0.35, -h * 0.05, w * 0.92, h * 0.45), fill=180)
    g = g.filter(ImageFilter.GaussianBlur(55))
    colored = Image.new("RGBA", (w, h))
    gp = g.load()
    cp = colored.load()
    for y in range(h):
        for x in range(w):
            k = gp[x, y] / 255.0
            if k < 0.02:
                cp[x, y] = (0, 0, 0, 0)
                continue
            cp[x, y] = (
                int(200 + 40 * k),
                int(220 + 30 * k),
                int(245),
                int(255 * k * 0.85),
            )
    return colored


def glass_frost(w: int, h: int) -> Image.Image:
    n = Image.effect_noise((w, h), 28)
    n = ImageOps.autocontrast(n.filter(ImageFilter.GaussianBlur(1.2)))
    out = Image.new("RGBA", (w, h))
    op = out.load()
    np = n.load()
    for y in range(h):
        for x in range(w):
            t = np[x, y] / 255.0
            d = int((t - 0.5) * 35)
            op[x, y] = (128 + d, 136 + d, 148 + d, int(18 + abs(t - 0.5) * 90))
    return out.filter(ImageFilter.GaussianBlur(0.8))


def glass_streaks(w: int, h: int, seed: int) -> Image.Image:
    rnd = random.Random(seed)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    for _ in range(140):
        x0 = rnd.randint(0, w)
        y0 = rnd.randint(-80, h)
        ln = rnd.randint(40, 220)
        ww = rnd.uniform(1.2, 4.5)
        gray = rnd.randint(180, 245)
        a = rnd.randint(12, 55)
        for j in range(ln):
            yy = y0 + j
            if yy >= h:
                break
            xx = x0 + rnd.uniform(-1.2, 1.2)
            draw.ellipse((xx - ww, yy - ww, xx + ww, yy + ww), fill=(gray, gray + 8, gray + 14, max(0, a - j // 6)))
    im = im.filter(ImageFilter.GaussianBlur(2.2))
    return im


def glass_drops(w: int, h: int, seed: int) -> Image.Image:
    rnd = random.Random(seed)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    for _ in range(220):
        cx = rnd.randint(0, w)
        cy = rnd.randint(-40, h)
        rx = rnd.uniform(1.5, 9)
        ry = rnd.uniform(2, 14)
        a = rnd.randint(35, 120)
        # small highlight blob
        for k in range(3):
            ox = rnd.uniform(-0.5, 0.5)
            oy = rnd.uniform(-0.5, 0.5)
            draw.ellipse(
                (cx - rx + ox, cy - ry + oy, cx + rx + ox, cy + ry + oy),
                fill=(245, 250, 255, max(0, a - k * 18)),
            )
    im = im.filter(ImageFilter.GaussianBlur(0.9))
    return im


def feather_logo(src: Path, dest: Path) -> None:
    if not src.is_file():
        print(f"Skip feather: missing {src}", file=sys.stderr)
        return
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()
    # soften alpha (anti-fringe)
    a_chan = Image.new("L", (w, h))
    ap = a_chan.load()
    for y in range(h):
        for x in range(w):
            ap[x, y] = px[x, y][3]
    a_chan = a_chan.filter(ImageFilter.GaussianBlur(1.1))
    ap2 = a_chan.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, ap2[x, y])
    img.save(dest, "PNG", optimize=True)
    print(f"Wrote {dest} size={img.size}")


def main() -> None:
    ensure_dirs()

    cw, ch = 1280, 720
    out_w, out_h = 2560, 1440

    def up(img: Image.Image) -> Image.Image:
        if img.size == (out_w, out_h):
            return img
        return img.resize((out_w, out_h), Image.Resampling.LANCZOS)

    # Hero cloud layers (baked textures + drift in CSS)
    c_far = up(storm_cloud(cw, ch, 101, blur=36, contrast=1.35))
    c_mid = up(storm_cloud(cw, ch, 202, blur=24, contrast=1.55))
    c_near = up(storm_cloud(cw, ch, 303, blur=14, contrast=1.75))

    c_far.save(FX / "hero_cloud_far.png", "PNG", optimize=True)
    c_mid.save(FX / "hero_cloud_mid.png", "PNG", optimize=True)
    c_near.save(FX / "hero_cloud_near.png", "PNG", optimize=True)
    up(edge_vignette(cw, ch)).save(FX / "hero_vignette.png", "PNG", optimize=True)
    print(f"Wrote hero_cloud_*.png + hero_vignette ({out_w}x{out_h})")

    fa = up(fog_sheet(cw, ch, 501, spread=22))
    fb = up(fog_sheet(cw, ch, 607, spread=28))
    fa.save(FX / "hero_fog_a.png", "PNG", optimize=True)
    fb.save(FX / "hero_fog_b.png", "PNG", optimize=True)
    print("Wrote hero_fog_*.png")

    flash = up(lightning_flash_png(cw, ch))
    flash.save(FX / "hero_lightning_flash.png", "PNG", optimize=True)
    print("Wrote hero_lightning_flash.png")

    # Wet glass (tileable-ish full-frame textures)
    gw, gh = 1920, 1080
    glass_frost(gw, gh).save(FX / "glass_distort.png", "PNG", optimize=True)
    glass_streaks(gw, gh, 909).save(FX / "glass_streaks.png", "PNG", optimize=True)
    glass_drops(gw, gh, 1001).save(FX / "glass_drops.png", "PNG", optimize=True)
    print("Wrote glass_*.png")

    # Tarot (PD RWS)
    base = "https://commons.wikimedia.org/wiki/Special:FilePath/"
    pairs = [
        ("RWS_Tarot_09_Hermit.jpg", TAROT / "hermit.jpg"),
        ("RWS_Tarot_18_Moon.jpg", TAROT / "moon.jpg"),
        ("RWS_Tarot_11_Justice.jpg", TAROT / "justice.jpg"),
        ("RWS_Tarot_20_Judgement.jpg", TAROT / "judgement.jpg"),
    ]
    for fn, dest in pairs:
        if dest.is_file() and dest.stat().st_size > 5000:
            print(f"Keep existing {dest.name}")
            continue
        download(base + fn, dest)

    src_logo = BR / "dream_echo_logo_clean.png"
    feather_logo(src_logo, BR / "dream_echo_logo_soft.png")

    sync_fx_layout()


if __name__ == "__main__":
    main()
