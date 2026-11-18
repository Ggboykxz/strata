#!/usr/bin/env python3
"""Studio-grade smoke inputs for STRATA props/golem.

Light, depth, volume cues, specular breakup, gradients, vignette, rim glow — all
pixels deterministic from fixed seeds; no fonts, no external art.
"""
import hashlib
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

S = 256


def bg() -> Image.Image:
    img = Image.new("RGB", (S, S), (86, 90, 104))
    px = img.load()
    cx, cy = S / 2.0, S * 0.58
    max_d = math.hypot(S * 0.72, S * 0.58)
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - cx, y - cy) / max_d
            t = min(1.0, d ** 1.35)
            c0 = (104, 110, 130)
            c1 = (40, 42, 52)
            px[x, y] = tuple(round(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    return img


def vshade(img, poly, c_light, c_dark, vertical=False):
    """Linear two-stop shading inside a polygon."""
    d = ImageDraw.Draw(img)
    if vertical:
        for y in range(S):
            t = y / S
            col = tuple(round(c_light[i] + (c_dark[i] - c_light[i]) * t) for i in range(3))
            d.line([(0, y), (S, y)], fill=col, width=1)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    return Image.composite(Image.new("RGB", (S, S), c_light), img, mask)


def facet_disc(draw, cx, cy, r, tone, jitter=14, seed=7):
    rng = random.Random(seed)
    N = 40
    for i in range(N):
        a = rng.uniform(0, 2 * math.pi)
        rr = r * rng.uniform(0.5, 1.0)
        px, py = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        sz = rng.uniform(4, 12)
        j = rng.randint(-jitter, jitter)
        col = tuple(max(0, min(255, c + j)) for c in tone)
        draw.ellipse([px - sz, py - sz, px + sz, py + sz], fill=col)


def save(img, out, prompt_hash_source, label):
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, format="PNG")
    sha = hashlib.sha256(out.read_bytes()).hexdigest()
    ph = hashlib.sha256(prompt_hash_source).hexdigest()
    print(f"wrote {out}")
    print(f"input_sha256 {sha}")
    print(f"prompt_hash {ph}")


def golem():
    img = bg()
    d = ImageDraw.Draw(img)
    cx = S // 2
    STONE = (128, 96, 52)
    STONE_LIGHT = (158, 124, 74)
    STONE_DARK = (72, 50, 26)
    EDGE = (34, 24, 12)
    # head: faceted square with notch (crown)
    d.polygon([(108, 52), (148, 52), (152, 96), (138, 100), (112, 100), (100, 96)], fill=STONE, outline=EDGE, width=3)
    # shoulder pauldrons
    d.polygon([(68, 116), (108, 96), (110, 116)], fill=STONE_LIGHT, outline=EDGE, width=2)
    d.polygon([(188, 116), (148, 96), (146, 116)], fill=STONE_LIGHT, outline=EDGE, width=2)
    # torso: trapezoid slabs
    d.polygon([(84, 112), (172, 112), (184, 168), (168, 196), (88, 196), (72, 168)], fill=STONE, outline=EDGE, width=3)
    # torso slab seams
    for y in (130, 152, 172):
        d.line([(78, y), (178, y)], fill=STONE_DARK, width=2)
    # arms: thick pillars hanging
    for sign in (1, -1):
        x = cx + sign * 58
        d.polygon([(x - 14, 112), (x + 14, 112), (x + 16, 178), (x + 12, 214), (x - 12, 214), (x - 16, 178)], fill=STONE, outline=EDGE, width=2)
        # gauntlets
        d.rectangle([x - 14, 190, x + 14, 214], fill=STONE_LIGHT, outline=EDGE, width=2)
    # legs: two pillars with knee gap
    for sign in (1, -1):
        x = cx + sign * 26
        d.polygon([(x - 12, 196), (x + 12, 196), (x + 14, 242), (x - 14, 242)], fill=STONE, outline=EDGE, width=2)
    # feet plates
    d.rectangle([82, 234, 112, 248], fill=STONE_DARK)
    d.rectangle([144, 234, 174, 248], fill=STONE_DARK)
    # eye glow
    for sign in (1, -1):
        ex = cx + sign * 10
        d.ellipse([ex - 4, 70, ex + 4, 78], fill=(255, 176, 64))
        d.ellipse([ex - 2, 72, ex + 2, 76], fill=(255, 232, 140))
    # top highlight
    d.line([(112, 56), (144, 56)], fill=STONE_LIGHT, width=2)
    src = b"golem|v3|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("golem"), src


def chest():
    img = bg()
    d = ImageDraw.Draw(img)
    # body base
    d.rectangle([48, 108, 208, 224], fill=(128, 86, 44), outline=(46, 26, 12), width=3)
    # wood planks with grain
    rng = random.Random(2026)
    for y in (136, 168, 200):
        d.line([(50, y), (206, y)], fill=(96, 60, 28), width=2)
        for _ in range(6):
            x0 = rng.randint(56, 190)
            d.line([(x0, y + rng.randint(-6, 6)), (x0 + rng.randint(10, 40), y + rng.randint(-6, 6))], fill=(140, 104, 58), width=1)
    # lid (slightly open)
    d.rectangle([48, 78, 208, 110], fill=(140, 96, 50), outline=(46, 26, 12), width=3)
    d.polygon([(56, 78), (200, 78), (204, 66), (60, 66)], fill=(88, 54, 24), outline=(46, 26, 12), width=2)
    # metal straps + studs
    for x in (80, 176):
        d.rectangle([x - 5, 66, x + 5, 224], fill=(172, 140, 70), outline=(90, 60, 20), width=1)
        for y in (96, 128, 160, 192):
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(220, 196, 120))
    # lock plate
    d.rectangle([114, 104, 142, 138], fill=(210, 172, 74), outline=(70, 48, 16), width=2)
    d.rectangle([122, 118, 134, 130], fill=(70, 48, 16))
    d.ellipse([125, 124, 131, 131], fill=(210, 172, 74))
    # glow from lid crack
    d.line([(64, 78), (192, 78)], fill=(255, 220, 96), width=1)
    src = b"chest|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("chest"), src


def shield():
    img = bg()
    d = ImageDraw.Draw(img)
    outline = [(128, 16), (220, 58), (204, 168), (128, 240), (52, 168), (36, 58)]
    inner = [(128, 38), (196, 72), (182, 156), (128, 214), (74, 156), (60, 72)]
    # outer with metallic rim
    d.polygon(outline, fill=(74, 86, 118), outline=(18, 22, 34), width=4)
    # quarters
    d.polygon([(128, 38), (188, 70), (182, 152), (128, 206), (128, 38)], fill=(128, 152, 210))
    d.polygon([(128, 38), (68, 70), (74, 152), (128, 206), (128, 38)], fill=(52, 62, 88))
    # chevron
    d.polygon([(128, 78), (164, 108), (140, 108), (140, 188), (128, 188), (128, 108), (92, 108), (128, 68)], fill=(224, 204, 110), outline=(64, 44, 12), width=2)
    # rim rivets
    for (px, py) in [(128, 26), (46, 66), (216, 60), (56, 168), (200, 168), (128, 232)]:
        d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(220, 200, 120), outline=(90, 70, 30), width=1)
    # center boss
    d.ellipse([112, 128, 144, 160], fill=(240, 220, 140), outline=(90, 70, 30), width=2)
    src = b"shield|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("shield"), src


def crystal():
    img = bg()
    d = ImageDraw.Draw(img)
    # outer
    pts = [(128, 12), (176, 96), (158, 240), (98, 240), (80, 96)]
    d.polygon(pts, fill=(118, 72, 190), outline=(40, 14, 80), width=3)
    # inner light column
    d.polygon([(128, 30), (152, 96), (140, 240), (116, 240), (104, 96)], fill=(196, 148, 244))
    # rim light
    d.line([(82, 98), (100, 236)], fill=(226, 196, 252), width=2)
    d.line([(174, 98), (156, 236)], fill=(110, 64, 180), width=2)
    # cap-shine
    d.polygon([(128, 12), (148, 52), (140, 56), (108, 56), (100, 52), (128, 12)], fill=(238, 220, 255))
    # facet plates
    for y in (96, 132, 168, 204):
        d.line([(88, y), (168, y)], fill=(72, 34, 120), width=2)
    src = b"crystal|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("crystal"), src


def coin():
    img = bg()
    d = ImageDraw.Draw(img)
    d.ellipse([22, 22, 234, 234], fill=(204, 164, 48), outline=(84, 54, 12), width=5)
    d.ellipse([36, 36, 220, 220], fill=(228, 196, 92), outline=(120, 88, 30), width=2)
    d.ellipse([46, 46, 210, 210], outline=(244, 226, 140), width=1)
    # shine wedge
    d.pieslice([40, 40, 216, 216], start=200, end=340, fill=(248, 232, 150))
    # central portrait:
    d.ellipse([92, 92, 164, 164], fill=(204, 164, 48), outline=(120, 88, 30), width=4)
    # star/emblem
    d.polygon([(128, 100), (136, 134), (164, 134), (141, 149), (150, 172), (128, 156), (106, 172), (115, 149), (92, 134), (120, 134)], fill=(120, 88, 30))
    # rim notches
    for a in range(0, 360, 18):
        px_ = 128 + 92 * math.cos(math.radians(a))
        py_ = 128 + 92 * math.sin(math.radians(a))
        d.ellipse([px_ - 3, py_ - 3, px_ + 3, py_ + 3], fill=(120, 88, 30))
    src = b"coin|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("coin"), src


def torch_(name="torch"):
    img = bg()
    d = ImageDraw.Draw(img)
    # handle
    d.polygon([(116, 120), (140, 120), (136, 240), (120, 240)], fill=(108, 66, 34), outline=(40, 22, 10), width=2)
    # cage metal
    d.rectangle([88, 84, 168, 128], outline=(72, 76, 88), width=4)
    d.line([(88, 98), (168, 98)], fill=(72, 76, 88), width=3)
    d.line([(88, 118), (168, 118)], fill=(72, 76, 88), width=3)
    # cross braces
    d.line([(100, 128), (156, 84)], fill=(100, 104, 120), width=3)
    d.line([(156, 128), (100, 84)], fill=(100, 104, 120), width=3)
    # flame
    d.ellipse([100, 16, 156, 74], fill=(240, 116, 38), outline=(140, 44, 8), width=2)
    d.ellipse([112, 30, 144, 68], fill=(252, 190, 66))
    d.ellipse([120, 40, 136, 62], fill=(255, 238, 150))
    # heat glow streaks
    for dx, dy in [(-40, 0), (40, 0), (0, -46)]:
        glow = Image.new("L", (S, S), 0)
        ImageDraw.Draw(glow).ellipse([128 + dx - 24, 44 + dy - 30, 128 + dx + 24, 44 + dy + 30], fill=110)
        img = Image.composite(Image.new("RGB", (S, S), (255, 160, 80)), img, glow)
    src = b"torch|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path(name), src


def sword():
    img = bg()
    d = ImageDraw.Draw(img)
    cx = S // 2
    # blade
    d.polygon([(cx - 8, 24), (cx + 8, 24), (cx + 3, 150), (cx - 3, 150)], fill=(200, 206, 224), outline=(52, 56, 68), width=2)
    d.line([(cx, 32), (cx, 146)], fill=(160, 168, 190), width=2)
    # fuller
    d.polygon([(cx - 2, 44), (cx + 2, 44), (cx + 1, 140), (cx - 1, 140)], fill=(232, 236, 248))
    # crossguard
    d.polygon([(cx - 38, 150), (cx + 38, 150), (cx + 30, 166), (cx - 30, 166)], fill=(180, 144, 62), outline=(64, 40, 12), width=2)
    # grip
    d.rectangle([cx - 7, 166, cx + 7, 224], fill=(118, 74, 40), outline=(46, 26, 12), width=2)
    for y in (174, 192, 210):
        d.line([(cx - 7, y), (cx + 7, y)], fill=(70, 40, 18), width=2)
    # pommel
    d.ellipse([cx - 12, 222, cx + 12, 248], fill=(180, 144, 62), outline=(64, 40, 12), width=2)
    # glint
    d.line([(cx - 2, 30), (cx - 6, 58)], fill=(255, 255, 255), width=2)
    src = b"sword|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("sword"), src


def pine():
    img = bg()
    d = ImageDraw.Draw(img)
    cx = S // 2
    d.polygon([(cx - 13, 186), (cx + 13, 186), (cx + 15, 242), (cx - 15, 242)], fill=(110, 70, 38), outline=(48, 28, 12), width=2)
    layers = [(180, 28), (150, 54), (118, 78), (84, 100)]
    rng = random.Random(113)
    for idx, (top, half) in enumerate(layers):
        jitter = rng.randint(-6, 6)
        base = 60 + idx * 16
        d.polygon([(cx - half, top + 44), (cx + half, top + 44), (cx + jitter, top)], fill=(40 + idx * 6, 92 + idx * 4, 44 + idx * 2), outline=(14, 30, 16), width=2)
    # snow cap
    d.polygon([(cx - 20, 96), (cx, 84), (cx + 20, 96), (cx + 8, 102), (cx - 8, 102)], fill=(232, 238, 244))
    src = b"pine|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("pine"), src


def rock():
    img = bg()
    d = ImageDraw.Draw(img)
    rng = random.Random(20261118)
    points = []
    for i in range(16):
        a = i * 2 * math.pi / 16
        r = 86 + rng.randint(-26, 16)
        points.append((128 + r * math.cos(a), 132 + r * math.sin(a) * 0.78))
    d.polygon(points, fill=(108, 112, 124), outline=(42, 46, 54), width=3)
    facet_disc(d, 116, 116, 66, (128, 132, 144), jitter=16, seed=77)
    for _ in range(30):
        x = 128 + rng.randint(-70, 70)
        y = 132 + rng.randint(-60, 60)
        rr = rng.randint(8, 26)
        col = (140, 146, 158) if rng.random() < 0.5 else (78, 82, 92)
        d.polygon([(x - rr, y), (x + rng.randint(0, rr), y - rr), (x + rng.randint(0, rr), y + rr)], fill=col)
    src = b"rock|v2|seed=20261118"
    return img.filter(ImageFilter.SMOOTH), out_path("rock"), src


def out_path(label):
    return Path(f"/content/ai/v2-{label}_input.png")


def main():
    for label, fn in [("golem", golem), ("chest", chest), ("shield", shield), ("crystal", crystal),
                      ("coin", coin), ("torch", lambda: torch_("torch")), ("sword", sword), ("pine", pine), ("rock", rock)]:
        img, out, src = fn()
        save(img, out, src + b"|v2", label)
    return 0


if __name__ == "__main__":
    sys.exit(main())
