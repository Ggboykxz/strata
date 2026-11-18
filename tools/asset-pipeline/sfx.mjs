#!/usr/bin/env node
/**
 * sfx.mjs — deterministic jsfxr SFX smoke pack for STRATA (task AI-001, audio line).
 *
 * Tool: jsfxr (Unlicense, github.com/chr15m/jsfxr, audited revision
 *       6d9eabbb7579f19b207be0e7ed52548ffdb32c90 — AUDIT-2026-11-18-P0-006).
 *       The npm package `jsfxr@1.4.1` bundles the UNLICENSE whose git blob SHA is
 *       exactly that revision (verified in evidence 04-jsfxr-license-verify.log).
 *
 * Determinism: jsfxr's SoundEffect.getRawBuffer() calls Math.random() to fill a
 * 32-entry noise buffer. We REPLACE Math.random with a seeded mulberry32 PRNG
 * before every render and restore it afterwards. No unseeded Math.random is used.
 *
 * Parameters are literal constants captured once from jsfxr's own preset
 * generators (Params.pickupCoin / hitHurt / click / powerUp) under fixed seed
 * 0x5EED1234. They are printed verbatim per file and hashed as `prompt_hash`.
 *
 * Output: 16-bit signed PCM, mono, 44100 Hz WAV, written OUTSIDE git under
 * /content/ai/audio-sfx/ (no binaries in the repository).
 *
 * Usage: node tools/asset-pipeline/sfx.mjs [--out-dir <dir>]
 * Exit 0 on success; nonzero if jsfxr cannot be loaded or a render is non-deterministic.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT_DIR = (() => {
  const i = process.argv.indexOf('--out-dir');
  return i >= 0 ? resolve(process.argv[i + 1]) : '/content/ai/audio-sfx';
})();

// --- jsfxr resolution (installed outside git, under /content/ai/audio-node) ---
const localRequire = createRequire(import.meta.url);
let lib;
try {
  lib = localRequire('jsfxr');
} catch {
  const fallbackRequire = createRequire('/content/ai/audio-node/package.json');
  lib = fallbackRequire('jsfxr');
}
const sfxr = lib.sfxr;
if (!sfxr || typeof sfxr.toWave !== 'function') {
  console.error('FATAL: jsfxr.toWave unavailable — refusing to hand-roll a synthesizer.');
  process.exit(3);
}

// --- seeded PRNG: replaces Math.random only for the duration of a render ---
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- literal parameter constants (captured from jsfxr presets, see header) ---
const BASE = {
  oldParams: true, wave_type: 1,
  p_env_attack: 0, p_env_sustain: 0.3, p_env_punch: 0, p_env_decay: 0.4,
  p_base_freq: 0.3, p_freq_limit: 0, p_freq_ramp: 0, p_freq_dramp: 0,
  p_vib_strength: 0, p_vib_speed: 0, p_arp_mod: 0, p_arp_speed: 0,
  p_duty: 0, p_duty_ramp: 0, p_repeat_speed: 0, p_pha_offset: 0, p_pha_ramp: 0,
  p_lpf_freq: 1, p_lpf_ramp: 0, p_lpf_resonance: 0, p_hpf_freq: 0, p_hpf_ramp: 0,
  sound_vol: 0.5, sample_rate: 44100, sample_size: 16,
};

// Fixed seeds: one per file, recorded in the manifest and evidence log.
const PACK = {
  'swing.wav': {
    seed: 101, preset: 'pickupCoin (coin/sword-like)',
    params: {
      ...BASE, wave_type: 1,
      p_env_sustain: 0.0841819531749934, p_env_punch: 0.5948626843281091,
      p_env_decay: 0.18650225503370166, p_base_freq: 0.6057899786159396,
    },
  },
  'impact.wav': {
    seed: 202, preset: 'hitHurt (hit)',
    params: {
      ...BASE, wave_type: 1,
      p_env_sustain: 0.09828756144270301, p_env_decay: 0.1040497824549675,
      p_base_freq: 0.7050917190499604, p_freq_ramp: -0.38650225503370167,
      p_duty: 1, p_hpf_freq: 0.025276098260655997,
    },
  },
  'step.wav': {
    seed: 303, preset: 'click (footstep)',
    params: {
      ...BASE, wave_type: 3,
      p_env_sustain: 0.125276098260656, p_env_punch: 0.3266078300308436,
      p_env_decay: 0.3494281363673508, p_base_freq: 0.8712359636556357,
      p_arp_mod: -0.15961039848625658, p_arp_speed: 0.7136328473920002,
      p_pha_offset: 0.0382492243777961, p_pha_ramp: -0.2647416975349188,
      p_hpf_freq: 0.9076948764035478,
    },
  },
  'ui-confirm.wav': {
    seed: 404, preset: 'powerUp (ding)',
    params: {
      ...BASE, wave_type: 0,
      p_env_sustain: 0.033701464347541336, p_env_decay: 0.37954250909388065,
      p_base_freq: 0.26487669127527624, p_freq_ramp: 0.108099564909935,
      p_duty: 0.5050917190499603, p_repeat_speed: 0.7211700253188611,
    },
  },
};

function render(params, seed) {
  const saved = Math.random;
  Math.random = mulberry32(seed);
  try {
    const wave = sfxr.toWave(params);
    const m = /^data:[^;]+;base64,(.*)$/.exec(wave.dataURI);
    if (!m) throw new Error('unexpected dataURI from jsfxr');
    return Buffer.from(m[1], 'base64');
  } finally {
    Math.random = saved;
  }
}

function wavFacts(buf) {
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  const dataSize = buf.readUInt32LE(40);
  const samples = dataSize / (bits / 8 * channels);
  return {
    riff: buf.toString('ascii', 0, 4), wave: buf.toString('ascii', 8, 12),
    channels, sample_rate: sampleRate, bits_per_sample: bits,
    bytes: buf.length, data_bytes: dataSize, samples,
    duration_ms: +(samples / sampleRate * 1000).toFixed(3),
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const results = [];
let failed = false;
for (const [name, cfg] of Object.entries(PACK)) {
  const paramsString = JSON.stringify(cfg.params);
  const promptHash = createHash('sha256').update(paramsString).digest('hex');
  const a = render(cfg.params, cfg.seed);
  const b = render(cfg.params, cfg.seed); // determinism self-check
  const sha = createHash('sha256').update(a).digest('hex');
  const shaB = createHash('sha256').update(b).digest('hex');
  const deterministic = sha === shaB;
  if (!deterministic) failed = true;
  const path = join(OUT_DIR, name);
  writeFileSync(path, a);
  const facts = wavFacts(a);
  console.log(`\n=== ${name} ===`);
  console.log(`preset:       ${cfg.preset}`);
  console.log(`seed:         ${cfg.seed} (mulberry32, replaces Math.random during jsfxr render)`);
  console.log(`params:       ${paramsString}`);
  console.log(`prompt_hash:  ${promptHash}  (sha256 of params JSON string)`);
  console.log(`sha256:       ${sha}`);
  console.log(`determinism:  ${deterministic ? 'PASS (two independent seeded renders byte-identical)' : 'FAIL'}`);
  console.log(`wav:          ${JSON.stringify(facts)}`);
  results.push({ file: name, path, preset: cfg.preset, seed: cfg.seed,
    params: cfg.params, params_string: paramsString, prompt_hash: promptHash,
    sha256: sha, deterministic, ...facts });
}

const summary = {
  tool: 'jsfxr', tool_version: '1.4.1', licence_id: 'JSFXR',
  licence: 'Unlicense (public domain), git blob 6d9eabbb7579f19b207be0e7ed52548ffdb32c90',
  source: 'https://github.com/chr15m/jsfxr',
  sample_rate_hz: 44100, bit_depth: 16, channels: 1,
  out_dir: OUT_DIR, generated_at_utc: new Date().toISOString(),
  deterministic_all: results.every(r => r.deterministic), files: results,
};
console.log('\n---JSON-SUMMARY-BEGIN---');
console.log(JSON.stringify(summary, null, 2));
console.log('---JSON-SUMMARY-END---');
if (failed) {
  console.error('FATAL: a render was not deterministic.');
  process.exit(4);
}
