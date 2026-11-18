#!/usr/bin/env python3
"""Kokoro-82M intro sting smoke generator for STRATA (task AI-001, audio line).

Model: hexgrad/Kokoro-82M, apache-2.0, HF snapshot f3ff3571791e39611d31c381e3a41a3af07b4987
(AUDIT-2026-11-18-P0-006, licence id KOKORO). Weights and voice tensors are read
from the local directory produced by `hf download` — no network at inference.

Official usage reference (model card README.md, cited in evidence 07/08):
  https://huggingface.co/hexgrad/Kokoro-82M/raw/main/README.md
  pip install kokoro>=0.9.2 soundfile ; KPipeline(lang_code='a') ; voice='af_heart'

The documented default voice `af_heart` and `lang_code='a'` are used verbatim,
even though the line is French: this is a smoke artifact, not production TTS.
Output: 16-bit PCM WAV under /content/ai (never inside git).
"""
import hashlib
import json
import os
import time

import numpy as np
import soundfile as sf
import torch

TEXT = "Strata — une aventure en devenir."
MODEL_DIR = "/content/ai/models/kokoro-82m"
VOICE_KEY = "af_heart"  # documented default voice of the model card
VOICE_PATH = os.path.join(MODEL_DIR, "voices", f"{VOICE_KEY}.pt")
OUT_PATH = "/content/ai/audio-intro.wav"
LANG_CODE = "a"  # documented default lang_code of the model card
SAMPLE_RATE = 24000  # model card usage block: sf.write(..., audio, 24000)

torch.manual_seed(0)
np.random.seed(0)

from kokoro import KModel, KPipeline  # noqa: E402

t0 = time.perf_counter()
model = KModel(
    repo_id="hexgrad/Kokoro-82M",
    config=os.path.join(MODEL_DIR, "config.json"),
    model=os.path.join(MODEL_DIR, "kokoro-v1_0.pth"),
).to("cpu").eval()
pipeline = KPipeline(lang_code=LANG_CODE, repo_id="hexgrad/Kokoro-82M", model=model, device="cpu")

segments = []
chunks = []
for i, (graphemes, phonemes, audio) in enumerate(pipeline(TEXT, voice=VOICE_PATH)):
    chunks.append({"index": i, "graphemes": graphemes, "phonemes": phonemes})
    segments.append(audio.cpu().numpy())

if not segments:
    raise SystemExit("FATAL: Kokoro produced no audio chunks")

audio = np.concatenate(segments)
sf.write(OUT_PATH, audio, SAMPLE_RATE, subtype="PCM_16")
wall = time.perf_counter() - t0

info = sf.info(OUT_PATH)
with open(OUT_PATH, "rb") as f:
    sha = hashlib.sha256(f.read()).hexdigest()
size = os.path.getsize(OUT_PATH)
with open(VOICE_PATH, "rb") as f:
    voice_sha = hashlib.sha256(f.read()).hexdigest()

facts = {
    "model": "hexgrad/Kokoro-82M",
    "hf_snapshot": "f3ff3571791e39611d31c381e3a41a3af07b4987",
    "weights_sha256": "496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4",
    "text": TEXT,
    "text_sha256": hashlib.sha256(TEXT.encode("utf-8")).hexdigest(),
    "lang_code": LANG_CODE,
    "voice": VOICE_KEY,
    "voice_path": VOICE_PATH,
    "voice_sha256": voice_sha,
    "chunks": chunks,
    "output": OUT_PATH,
    "output_sha256": sha,
    "output_bytes": size,
    "subtype": info.subtype,
    "sample_rate": info.samplerate,
    "channels": info.channels,
    "frames": info.frames,
    "duration_ms": round(info.frames / info.samplerate * 1000, 3),
    "wall_seconds": round(wall, 3),
    "device": "cpu",
    "torch_version": torch.__version__,
}
print(json.dumps(facts, indent=2, ensure_ascii=False))
