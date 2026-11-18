#!/usr/bin/env python3
"""Deterministic generator for the AI-001 smoke input image.

Draws an ORIGINAL, synthetic 256x256 RGB image of a faceted golem/hero-like
silhouette: symmetric mirrored polygons over a radial gradient background.
This is a procedural test input authored for STRATA AI-001. It is not
borrowed art, not a photo, not derived from any commercial IP, and not
production art.

Determinism: seeded RNG (SEED constant), fixed palette, no clock, no
environment reads, no font files. Re-running on the same Pillow version
produces the same bytes.

prompt_hash = sha256(gen_input.py bytes + PARAMS), where PARAMS is the
canonical parameter string below. Both hashes are printed on stdout.
"""

import hashlib
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 256
SEED = 1337
PARAMS = "seed=1337;size=256;palette=strata-golem-v1;bg=radial;facets=96;mode=rgb"

# Fixed palette (faceted golem: warm stone amber/ochre over deep teal indigo).
PALETTE = {
    "bg_center": (38, 54, 74),      # lighter glow behind the figure
    "bg_edge": (8, 12, 22),         # dark vignette
    "body_base": (126, 84, 44),     # mid stone
    "body_light": (196, 141, 74),   # lit facet
    "body_dark": (74, 46, 24),      # shadow facet
    "body_edge": (24, 14, 8),       # outline
    "glow": (255, 176, 64),         # eye core
    "glow_soft": (120, 66, 16),     # eye rim
}


def radial_background() -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE))
    cx = cy = SIZE / 2.0
    max_d = math.hypot(cx, cy)
    px = img.load()
    cen, edge = PALETTE["bg_center"], PALETTE["bg_edge"]
    for y in range(SIZE):
        for x in range(SIZE):
            d = math.hypot(x - cx, y - cy) / max_d
            t = min(1.0, d ** 1.25)
            px[x, y] = tuple(round(cen[i] + (edge[i] - cen[i]) * t) for i in range(3))
    return img


def golem_polygon():
    right = [
        (128, 30), (158, 38), (166, 66), (150, 78),
        (176, 92), (212, 108), (220, 150), (188, 156),
        (182, 226), (158, 232), (154, 246), (128, 246),
    ]
    left = [(256 - x, y) for (x, y) in reversed(right[1:-1])]
    return right + left


def draw_mask() -> Image.Image:
    mask = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(mask)
    d.polygon(golem_polygon(), fill=255)
    # arm columns, mirrored
    for sign in (1, -1):
        cx = 128 + sign * 96
        d.polygon([(cx - 14, 118), (cx + 14, 118), (cx + 18, 214), (cx - 18, 214)], fill=255)
    return mask


def draw_facets(rng, mask: Image.Image) -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE), PALETTE["body_base"])
    d = ImageDraw.Draw(img)
    base, light, dark = PALETTE["body_base"], PALETTE["body_light"], PALETTE["body_dark"]
    inner = [(x, y) for y in range(SIZE) for x in range(SIZE) if mask.getpixel((x, y)) > 0]
    for _ in range(96):
        p = [inner[rng.randrange(len(inner))] for _ in range(3)]
        shade = rng.random()
        if shade < 0.33:
            col = dark
        elif shade < 0.66:
            col = base
        else:
            col = light
        # jitter the shade a little so facets are not flat
        j = rng.randint(-12, 12)
        col = tuple(max(0, min(255, c + j)) for c in col)
        d.polygon(p, fill=col)
    # vertical spine light (symmetric, non-random)
    d.polygon([(122, 40), (134, 40), (136, 236), (120, 236)], fill=tuple(min(255, c + 28) for c in base))
    return img


def main() -> int:
    out_path = Path("/content/ai/hero_input.png")
    rng = __import__("random").Random(SEED)

    bg = radial_background()
    mask = draw_mask()
    facets = draw_facets(rng, mask)

    out = bg.copy()
    out.paste(facets, (0, 0), mask)

    d = ImageDraw.Draw(out)
    # outline
    d.polygon(golem_polygon(), outline=PALETTE["body_edge"], width=3)
    for sign in (1, -1):
        cx = 128 + sign * 96
        d.polygon([(cx - 14, 118), (cx + 14, 118), (cx + 18, 214), (cx - 18, 214)],
                  outline=PALETTE["body_edge"], width=3)
    # eyes (symmetric, non-random positions)
    for sign in (1, -1):
        ex = 128 + sign * 18
        d.polygon([(ex - 9, 57), (ex + 9, 55), (ex + 7, 63), (ex - 7, 63)], fill=PALETTE["glow_soft"])
        d.polygon([(ex - 6, 58), (ex + 6, 57), (ex + 4, 61), (ex - 4, 61)], fill=PALETTE["glow"])
    # crown notch (non-random)
    d.polygon([(120, 30), (136, 30), (128, 16)], fill=PALETTE["body_dark"], outline=PALETTE["body_edge"])

    out = out.filter(ImageFilter.SMOOTH)
    assert out.mode == "RGB" and out.size == (SIZE, SIZE)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(out_path, format="PNG")

    img_sha = hashlib.sha256(out_path.read_bytes()).hexdigest()
    prompt_hash = hashlib.sha256(Path(__file__).read_bytes() + b"|" + PARAMS.encode()).hexdigest()
    print(f"wrote {out_path}")
    print(f"params {PARAMS}")
    print(f"input_sha256 {img_sha}")
    print(f"prompt_hash {prompt_hash}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
