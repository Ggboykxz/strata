#!/usr/bin/env python3
"""VRAM tier detection for STRATA (master §8.3). Never guess a number (I13).

If no NVIDIA device is visible the answer is NO_GPU and the CPU-safe policy is printed: CC0 kitbash plus
procedural geometry/textures/keyframes, no generation. This script never downloads a model and never reads
a token. The full model audit remains P0-006 (I4).
"""
from __future__ import annotations

import json
import shutil
import subprocess


def device() -> tuple[int | None, str | None]:
    if shutil.which("nvidia-smi") is None:
        return None, None
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.total,name", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10, check=True,
        )
        parts = [p.strip() for p in r.stdout.strip().splitlines()[0].split(",")]
        return int(parts[0]), parts[1] if len(parts) > 1 else None
    except (OSError, ValueError, IndexError, subprocess.SubprocessError):
        return None, None


def tier_for(mib: int | None, name: str | None) -> tuple[str, str]:
    if mib is None:
        return "CPU", "NO_GPU — CPU-safe work only: CC0 kitbash + procedural geometry/textures/keyframes, no generation"
    gb = mib / 1024
    # A T4 reports 15360 MiB because ECC reserves memory; master §8.3 calls that the 16 GB tier.
    if name and "T4" in name.upper():
        return "16GB", "T4 nominal 16 GB (ECC-reserved); quantized/offload generation; Blender bake; KTX2"
    if gb >= 24:
        return "24GB+", "full generation tier; audit each model before use (P0-006)"
    if gb >= 16:
        return "16GB", "quantized/offload generation; Blender bake; KTX2; degrade gracefully"
    if gb >= 12:
        return "12GB", "TripoSR + projection bake; Mesh2Motion CC0; procedural terrain"
    return "CPU", "under 8 GB: CC0 kitbash + procedural geometry, no generation"


def main() -> int:
    mib, name = device()
    tier, policy = tier_for(mib, name)
    data = {
        "gpu": mib is not None,
        "gpu_name": name,
        "vram_mib": mib,
        "vram_gb": round(mib / 1024, 2) if mib is not None else None,
        "tier": tier,
        "policy": policy,
        "source": "nvidia-smi" if mib is not None else "no NVIDIA device visible",
    }
    print(json.dumps(data, ensure_ascii=False))
    if mib is None:
        print(policy)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
