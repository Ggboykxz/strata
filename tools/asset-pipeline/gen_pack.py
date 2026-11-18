#!/usr/bin/env python3
"""Second batch of STRATA smoke-art inputs (procedural, deterministic, flat gray background)."""
import hashlib
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 256
GRAY = (216, 216, 216)


def out_path(label):
    return Path(f"/content/ai/{label}_input.png")


def save(img, out, prompt_hash_source, label):
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, format="PNG")
    sha = hashlib.sha256(out.read_bytes()).hexdigest()
    prompt = hashlib.sha256(prompt_hash_source).hexdigest()
    print(f"wrote {out}")
    print(f"input_sha256 {sha}")
    print(f"prompt_hash {prompt}")


def bg():
    return Image.new("RGB", (SIZE, SIZE), GRAY)


def chest():
    img = bg()
    d = ImageDraw.Draw(img)
    # body
    d.rectangle([48, 112, 208, 218], fill=(112, 72, 38), outline=(48, 28, 14), width=3)
    # lid
    d.rectangle([48, 76, 208, 112], fill=(128, 84, 46), outline=(48, 28, 14), width=3)
    d.rectangle([48, 74, 208, 78], fill=(72, 44, 22))
    # bands
    for x in (78, 178):
        d.rectangle([x - 4, 76, x + 4, 218], fill=(150, 122, 60), outline=(60, 46, 18), width=1)
    # lock
    d.rectangle([118, 108, 138, 132], fill=(200, 168, 66), outline=(70, 52, 12), width=2)
    d.ellipse([124, 120, 132, 130], fill=(70, 52, 12))
    return img.filter(ImageFilter.SMOOTH), "chest", b"chest|seed=20261118|flat-gray-216|metal=two-bands"


def shield():
    img = bg()
    d = ImageDraw.Draw(img)
    d.polygon([(128, 18), (216, 62), (200, 168), (128, 238), (56, 168), (40, 62)], fill=(84, 96, 128), outline=(24, 30, 46), width=3)
    d.polygon([(128, 40), (192, 74), (180, 158), (128, 218), (76, 158), (64, 74)], fill=(120, 138, 176), outline=(24, 30, 46), width=2)
    d.rectangle([118, 90, 138, 182], fill=(200, 168, 66))
    d.rectangle([88, 118, 168, 140], fill=(200, 168, 66))
    return img.filter(ImageFilter.SMOOTH), "shield", b"shield|seed=20261118|flat-gray-216|quarter-chevron"


def crystal():
    img = bg()
    d = ImageDraw.Draw(img)
    d.polygon([(128, 16), (172, 96), (156, 232), (100, 232), (84, 96)], fill=(148, 96, 210), outline=(56, 24, 96), width=3)
    d.polygon([(128, 16), (148, 96), (128, 232), (108, 96)], fill=(196, 156, 240))
    for y in (128, 158, 188):
        d.line([(100, y), (156, y)], fill=(104, 64, 160), width=2)
    return img.filter(ImageFilter.SMOOTH), "crystal", b"crystal|seed=20261118|flat-gray-216|hex-facets"


def coin():
    img = bg()
    d = ImageDraw.Draw(img)
    d.ellipse([30, 30, 226, 226], fill=(200, 160, 44), outline=(92, 60, 16), width=4)
    d.ellipse([46, 46, 210, 210], outline=(240, 210, 110), width=3)
    d.rectangle([104, 88, 152, 168], fill=(92, 60, 16))
    d.rectangle([72, 112, 184, 148], fill=(92, 60, 16))
    return img.filter(ImageFilter.SMOOTH), "coin", b"coin|seed=20261118|flat-gray-216|struck-cross"


def torch():
    img = bg()
    d = ImageDraw.Draw(img)
    d.polygon([(116, 96), (140, 96), (136, 238), (120, 238)], fill=(92, 56, 28), outline=(40, 24, 12), width=2)
    # cage
    d.rectangle([88, 66, 168, 108], outline=(60, 60, 66), width=3)
    d.line([(88, 84), (168, 84)], fill=(60, 60, 66), width=2)
    # flame
    d.ellipse([104, 10, 152, 62], fill=(240, 128, 44), outline=(140, 48, 12), width=2)
    d.ellipse([116, 22, 144, 52], fill=(250, 210, 80))
    return img.filter(ImageFilter.SMOOTH), "torch", b"torch|seed=20261118|flat-gray-216|caged-flame"


def main():
    for label, fn in (("chest", chest), ("shield", shield), ("crystal", crystal), ("coin", coin), ("torch", torch)):
        img, name, src = fn()
        save(img, out_path(name), src + b"|" + str(src[:4].hex()).encode(), label)
    return 0


if __name__ == "__main__":
    sys.exit(main())
