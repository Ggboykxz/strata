#!/usr/bin/env python3
"""Procedural smoke inputs for STRATA AI-001 prop meshes (sword, rock, pine).

All three are ORIGINAL synthetic drawings on flat light-gray backgrounds (TripoSR `--no-remove-bg`
contract). Deterministic: fixed seeds, no clock, no external assets, no fonts.
Prompt hashes are printed on stdout for the manifest.
"""
import hashlib
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 256
GRAY = (216, 216, 216)


def bg() -> Image.Image:
    return Image.new("RGB", (SIZE, SIZE), GRAY)


def save(img: Image.Image, out: Path, prompt_hash_source: bytes, label: str) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, format="PNG")
    sha = hashlib.sha256(out.read_bytes()).hexdigest()
    prompt = hashlib.sha256(prompt_hash_source).hexdigest()
    print(f"wrote {out}")
    print(f"label {label}")
    print(f"input_sha256 {sha}")
    print(f"prompt_hash {prompt}")


def sword(seed: int = 20261118):
    img = bg()
    d = ImageDraw.Draw(img)
    cx = 128
    # blade: long tapered quad
    d.polygon([(cx - 10, 24), (cx + 10, 24), (cx + 4, 148), (cx - 4, 148)], fill=(176, 180, 192), outline=(60, 62, 70), width=3)
    # fuller (center ridge)
    d.polygon([(cx - 3, 40), (cx + 3, 40), (cx + 2, 140), (cx - 2, 140)], fill=(220, 224, 235))
    # cross-guard
    d.polygon([(cx - 34, 150), (cx + 34, 150), (cx + 28, 162), (cx - 28, 162)], fill=(150, 122, 60), outline=(60, 46, 18), width=2)
    # grip
    d.polygon([(cx - 7, 162), (cx + 7, 162), (cx + 7, 214), (cx - 7, 214)], fill=(94, 58, 30), outline=(40, 24, 12), width=2)
    # pommel
    d.ellipse([cx - 11, 214, cx + 11, 236], fill=(150, 122, 60), outline=(60, 46, 18), width=2)
    src = b"sword|seed=20261118|flat-gray-216|facets=synthetic"
    return img.filter(ImageFilter.SMOOTH), out_path("sword"), src


def rock(seed: int = 20261118):
    img = bg()
    d = ImageDraw.Draw(img)
    import random
    rng = random.Random(seed)
    points = []
    for i, ang in enumerate([i * 2 * math.pi / 14 for i in range(14)]):
        r = 78 + rng.randint(-26, 14)
        x = 128 + r * math.cos(ang)
        y = 128 + r * math.sin(ang) * 0.82
        points.append((x, y))
    d.polygon(points, fill=(112, 112, 120), outline=(52, 52, 58), width=3)
    # facet shading
    for _ in range(28):
        x = 128 + rng.randint(-66, 66)
        y = 128 + rng.randint(-54, 54)
        r = rng.randint(6, 22)
        col = (150, 150, 158) if rng.random() < 0.5 else (88, 88, 96)
        d.polygon([(x - r, y), (x + rng.randint(2, r), y - r), (x + rng.randint(2, r), y + r)], fill=col)
    src = b"rock|seed=20261118|flat-gray-216|facets=28"
    return img.filter(ImageFilter.SMOOTH), out_path("rock"), src


def pine(seed: int = 20261118):
    img = bg()
    d = ImageDraw.Draw(img)
    cx = 128
    trunk_w = 14
    d.polygon([(cx - trunk_w, 180), (cx + trunk_w, 180), (cx + trunk_w, 238), (cx - trunk_w, 238)], fill=(96, 62, 34), outline=(48, 30, 16), width=2)
    for top, half in [(232, 10), (196, 46), (158, 68), (118, 90)]:
        d.polygon([(cx - half, top), (cx + half, top), (cx, top - 96)], fill=(52, 88, 52), outline=(22, 44, 24), width=2)
    src = b"pine|seed=20261118|flat-gray-216|layers=4"
    return img.filter(ImageFilter.SMOOTH), out_path("pine"), src


def out_path(label: str) -> Path:
    return Path(f"/content/ai/{label}_input.png")


def main() -> int:
    for label, fn in (("sword", sword), ("rock", rock), ("pine", pine)):
        img, out, src = fn()
        save(img, out, Path(__file__).read_bytes() + b"|" + src, label)
    return 0


if __name__ == "__main__":
    sys.exit(main())
