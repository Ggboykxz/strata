#!/usr/bin/env python3
"""AI-001 smoke verifier (STRATA, A0012 Director bypass).

Default: fast, offline, GPU-free verification of the recorded pins, presence of the out-of-repo
binaries, their sha256 against the committed asset manifest, and the measured numbers against the
evidence logs. No number is invented: throughput and VRAM peak are read from the logs produced by the
250 ms nvidia-smi poll and the timed inference. Missing files or mismatches exit non-zero.

`--full`: re-runs the recorded TripoSR inference once (GPU, ~30 s) into /content/ai/output-full,
polls VRAM and prints the fresh measurements. It never overwrites the manifested asset or the
evidence. Both modes print the detected tier from the existing detect_tier.py probe.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "tools/asset-pipeline/manifests/ai-001-hero-mesh-0001.json"
GENERATOR = ROOT / "tools/asset-pipeline/gen_input_white.py"
EVIDENCE = ROOT / "docs/state/evidence/20261118T202814Z-TRIPOSR-RUN"
TRISRC = Path("/content/ai/graph/TripoSR")
WEIGHTS = Path("/content/ai/models/triposr")
INPUT = Path("/content/ai/hero_input_white.png")
OUTPUT = Path("/content/ai/output/0/mesh.glb")
SHIMS = Path("/content/ai/shim")
MODEL_REVISION = "107cefdc244c39106fa830359024f6a2f1c78871"
TRIPOSR_PY = "/content/ai/venv-trisr/bin/python"
RUN_CMD = [
    TRIPOSR_PY, "/content/ai/graph/TripoSR/run.py",
    "/content/ai/hero_input_white.png",
    "--pretrained-model-name-or-path", "/content/ai/models/triposr",
    "--output-dir", "/content/ai/output", "--no-remove-bg",
    "--model-save-format", "glb",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def print_tier() -> None:
    probe = ROOT / "tools/asset-pipeline/detect_tier.py"
    print(f"tier probe: python {probe.relative_to(ROOT)}")
    result = subprocess.run([sys.executable, str(probe)], text=True, capture_output=True)
    for line in result.stdout.splitlines():
        print("  " + line)
    if result.returncode != 0:
        print(f"  tier probe EXIT={result.returncode}")
    if result.stderr.strip():
        print("  tier stderr: " + result.stderr.strip())


def grep_number(path: Path, pattern: str) -> float | None:
    if not path.is_file():
        return None
    match = re.search(pattern, path.read_text(errors="replace"), re.M)
    return float(match.group(1)) if match else None


def prompt_hash() -> str | None:
    if not GENERATOR.is_file():
        return None
    text = GENERATOR.read_text()
    match = re.search(r'^PARAMS = "([^"]+)"', text, re.M)
    if not match:
        return None
    return hashlib.sha256(GENERATOR.read_bytes() + b"|" + match.group(1).encode()).hexdigest()


def verify_default() -> int:
    errors: list[str] = []
    print("AI-001 smoke — default (offline) verification")
    print(f"  generated_at_utc {datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}")
    print_tier()

    if not MANIFEST.is_file():
        print(f"FAIL missing manifest {MANIFEST}")
        return 1
    try:
        m = json.loads(MANIFEST.read_text())
    except (json.JSONDecodeError, OSError) as exc:
        print(f"FAIL manifest unreadable: {exc}")
        return 1

    required = [
        "asset_id", "licence_id", "model_revision", "weights_sha256", "weights_bytes",
        "prompt_hash", "tier", "gpu", "vram_visible_mib", "input_sha256",
        "output_sha256", "generated_at", "class", "throughput",
    ]
    for field in required:
        if not m.get(field):
            errors.append(f"manifest field {field} missing/empty")

    if m.get("licence_id") != "TRIPOSR":
        errors.append(f"licence_id {m.get('licence_id')!r} != TRIPOSR")
    if m.get("class") != "ai-generated-smoke-bypass-A0012":
        errors.append("unexpected asset class")

    if not TRISRC.is_dir():
        errors.append(f"missing model checkout {TRISRC}")
    else:
        rev = subprocess.run(["git", "-C", str(TRISRC), "rev-parse", "HEAD"],
                             text=True, capture_output=True).stdout.strip()
        print(f"  model pin rev-parse {rev}")
        if rev != MODEL_REVISION or rev != m.get("model_revision"):
            errors.append(f"model revision mismatch: checkout={rev} manifest={m.get('model_revision')}")

    ph = prompt_hash()
    print(f"  prompt_hash recomputed {ph}")
    if ph is None or ph != m.get("prompt_hash"):
        errors.append("prompt_hash != sha256(gen_input_white.py + PARAMS)")

    for label, path, expected in (
        ("weights", WEIGHTS / "model.ckpt", m.get("weights_sha256")),
        ("input", INPUT, m.get("input_sha256")),
        ("output.glb", OUTPUT, (m.get("output_sha256") or {}).get("glb")),
    ):
        if not path.is_file():
            errors.append(f"missing {label} {path}")
            continue
        got = sha256(path)
        size = path.stat().st_size
        print(f"  {label} bytes={size} sha256={got}")
        if expected and got != expected:
            errors.append(f"{label} sha256 mismatch: {got} != {expected}")
        if label == "weights" and m.get("weights_bytes") != size:
            errors.append(f"weights bytes mismatch: {size} != {m.get('weights_bytes')}")

    for p in (SHIMS / "rembg.py", SHIMS / "torchmcubes.py", SHIMS / "xatlas.py", SHIMS / "moderngl.py"):
        if not p.is_file():
            errors.append(f"missing refusal shim {p}")

    wall = grep_number(EVIDENCE / "35-triposr-inference-final.log", r"wall_seconds\s+([0-9.]+)")
    peak = grep_number(EVIDENCE / "37-vram-peak-fixed.log", r"peak_mib\s+(\d+)")
    verts = grep_number(EVIDENCE / "39-mesh-stats-fixed.log", r"^vertices\s+(\d+)")
    faces = grep_number(EVIDENCE / "39-mesh-stats-fixed.log", r"^faces\s+(\d+)")
    print(f"  evidence wall_seconds={wall} peak_mib={peak} vertices={verts} faces={faces}")
    if wall is None or peak is None or verts is None or faces is None:
        errors.append("one or more measured evidence logs are missing/unparseable")
    else:
        if abs(float((m.get("throughput") or {}).get("measured_seconds", -1)) - wall) > 1e-6:
            errors.append("manifest throughput.measured_seconds != evidence wall_seconds")
        if float((m.get("throughput") or {}).get("vram_peak_mib", -1)) != peak:
            errors.append("manifest throughput.vram_peak_mib != evidence peak_mib")
        stats = m.get("mesh_stats") or {}
        if stats.get("vertices") != int(verts) or stats.get("faces") != int(faces):
            errors.append("manifest mesh_stats != evidence mesh stats")

    print(f"  manifest asset_id={m.get('asset_id')} licence_id={m.get('licence_id')}")
    if errors:
        for e in errors:
            print("FAIL " + e)
        print(f"RESULT FAIL ({len(errors)} problem(s))")
        return 1
    print("RESULT PASS — pins, presence, sha256 and evidence-backed measured numbers agree")
    return 0


def poll_vram(path: Path) -> subprocess.Popen:
    return subprocess.Popen(
        ["nvidia-smi", "--query-gpu=timestamp,memory.used,utilization.gpu",
         "--format=csv,noheader", "-lms", "250"],
        stdout=path.open("w"), stderr=subprocess.DEVNULL,
    )


def peak_from_csv(path: Path) -> int | None:
    vals = []
    for line in path.read_text(errors="replace").splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 3 and parts[1].endswith("MiB"):
            try:
                vals.append(int(parts[1].split()[0]))
            except ValueError:
                pass
    return max(vals) if vals else None


def verify_full() -> int:
    print("AI-001 smoke --full (GPU inference, out-of-repo outputs)")
    print_tier()
    for p in (TRIPOSR_PY, WEIGHTS / "model.ckpt", INPUT, SHIMS / "rembg.py"):
        if not Path(p).exists():
            print(f"FAIL missing {p}")
            return 1
    outdir = Path("/content/ai/output-full/0")
    outdir.mkdir(parents=True, exist_ok=True)
    log = Path("/content/ai/output-full/inference.log")
    csv = Path("/content/ai/output-full/vram.csv")
    env = dict(os.environ, PYTHONPATH=str(SHIMS))
    cmd = [a if a != "/content/ai/output" else "/content/ai/output-full" for a in RUN_CMD]
    print("  command: " + " ".join(cmd))
    poll = poll_vram(csv)
    start = time.perf_counter()
    with log.open("w") as fh:
        result = subprocess.run(cmd, env=env, stdout=fh, stderr=subprocess.STDOUT)
    wall = time.perf_counter() - start
    poll.terminate()
    try:
        poll.wait(timeout=10)
    except subprocess.TimeoutExpired:
        poll.kill()
    print(f"  wall_seconds {wall:.3f}")
    print(f"  inference EXIT={result.returncode} (log {log})")
    if result.returncode != 0:
        print(log.read_text(errors="replace")[-3000:])
        return 1
    peak = peak_from_csv(csv)
    glb = outdir / "mesh.glb"
    if not glb.is_file():
        print(f"FAIL no GLB at {glb}")
        return 1
    print(f"  vram_peak_mib {peak}")
    print(f"  glb bytes {glb.stat().st_size} sha256 {sha256(glb)}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] not in ("--full",)):
        print("usage: python tools/asset-pipeline/smoke.py [--full]")
        sys.exit(64)
    sys.exit(verify_full() if len(sys.argv) == 2 else verify_default())
