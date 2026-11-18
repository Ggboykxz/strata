#!/usr/bin/env python3
"""TripoSR-friendly variant of gen_input.py: same original faceted golem on a flat light-gray background.

Derived from tools/asset-pipeline/gen_input.py by the same author; deterministic (SEED 1337). White/gray
background matches TripoSR's `--no-remove-bg` contract (model was trained on gray backgrounds).
"""
import hashlib, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import importlib.util

spec = importlib.util.spec_from_file_location("base", Path(__file__).with_name("gen_input.py"))
base = importlib.util.module_from_spec(spec)
sys.modules["base"] = base
spec.loader.exec_module(base)

PARAMS = "seed=1337;size=256;palette=strata-golem-v1;bg=flat-gray-216;facets=96;mode=rgb"
OUT = Path("/content/ai/hero_input_white.png")

def flat_background() -> Image.Image:
    return Image.new("RGB", (base.SIZE, base.SIZE), (216, 216, 216))

def main() -> int:
    out = OUT
    rng = __import__("random").Random(base.SEED)
    bg = flat_background()
    mask = base.draw_mask()
    facets = base.draw_facets(rng, mask)
    final = bg.copy()
    final.paste(facets, (0, 0), mask)
    d = ImageDraw.Draw(final)
    d.polygon(base.golem_polygon(), outline=base.PALETTE["body_edge"], width=3)
    for sign in (1, -1):
        cx = 128 + sign * 96
        d.polygon([(cx - 14, 118), (cx + 14, 118), (cx + 18, 214), (cx - 18, 214)],
                  outline=base.PALETTE["body_edge"], width=3)
    for sign in (1, -1):
        ex = 128 + sign * 18
        d.polygon([(ex - 9, 57), (ex + 9, 55), (ex + 7, 63), (ex - 7, 63)], fill=base.PALETTE["glow_soft"])
        d.polygon([(ex - 6, 58), (ex + 6, 57), (ex + 4, 61), (ex - 4, 61)], fill=base.PALETTE["glow"])
    d.polygon([(120, 30), (136, 30), (128, 16)], fill=base.PALETTE["body_dark"], outline=base.PALETTE["body_edge"])
    final = final.filter(ImageFilter.SMOOTH)
    final.save(out, format="PNG")
    img_sha = hashlib.sha256(out.read_bytes()).hexdigest()
    prompt_hash = hashlib.sha256((Path(__file__).read_bytes() + b"|" + PARAMS.encode())).hexdigest()
    print(f"wrote {out}")
    print(f"params {PARAMS}")
    print(f"input_sha256 {img_sha}")
    print(f"prompt_hash {prompt_hash}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
