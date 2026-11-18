/**
 * NET-GATE crash-restore / RPO measurement.
 *
 * A child process runs a real Room at 30 Hz and writes a single atomically-renamed checkpoint every 5 s.
 * The parent SIGKILLs it after the second checkpoint, then starts a fresh process that restores the last
 * complete checkpoint and reports the measured restore time and dataset. RPO is the configured interval
 * (5 s), not a production guarantee; the measured checkpoint age at kill is reported too.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url));
const childPath = join(here, 'crash-child.ts');
const registerPath = join(here, 'ts-register.mjs');
const CHECKPOINT_FILE = 'checkpoint.json';

interface CheckpointFile {
  readonly generation: number;
  readonly checkpointIntervalMs: number;
  readonly writtenAt: string;
  readonly tick: number;
  readonly hash: string;
  readonly clients: readonly { readonly clientId: number; readonly entityId: number; readonly appliedSeq: number }[];
  readonly intents: readonly unknown[];
  readonly ledger: { readonly log: readonly unknown[]; readonly checksum: string };
  readonly datasetBytes: { readonly world: number; readonly intents: number; readonly ledger: number };
}

interface ChildResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startChild(mode: 'run' | 'restore', directory: string): ChildProcessWithoutNullStreams {
  return spawn(
    process.execPath,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--import', registerPath,
      childPath,
      mode,
      directory,
    ],
    { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  ) as ChildProcessWithoutNullStreams;
}

function collect(child: ChildProcessWithoutNullStreams): Promise<ChildResult> {
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });
  return new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function readCheckpoint(directory: string): Promise<CheckpointFile | null> {
  try {
    return JSON.parse(await readFile(join(directory, CHECKPOINT_FILE), 'utf8')) as CheckpointFile;
  } catch {
    return null;
  }
}

function lastProgressTick(stdout: string): number {
  const lines = stdout.split('\n').filter((line) => line.startsWith('PROGRESS '));
  const last = lines.at(-1);
  if (!last) return 0;
  const match = /tick=(\d+)/.exec(last);
  return match?.[1] ? Number(match[1]) : 0;
}

describe('NET-GATE crash restore and RPO', () => {
  it('restores the last atomically written checkpoint in under 3 s and publishes a 5 s RPO', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'strata-netgate-'));
    let runner: ChildProcessWithoutNullStreams | null = null;
    try {
      const runnerStart = performance.now();
      runner = startChild('run', directory);
      const runnerClosed = collect(runner);

      const deadline = performance.now() + 25_000;
      let observed: CheckpointFile | null = null;
      for (;;) {
        observed = await readCheckpoint(directory);
        if (observed && observed.generation >= 2) break;
        if (performance.now() > deadline) {
          throw new Error(`runner wrote no second checkpoint; last generation ${String(observed?.generation)}`);
        }
        await sleep(25);
      }

      // Let the runner move a few ticks past the checkpoint, then kill it without any shutdown path.
      await sleep(150);
      const killStarted = performance.now();
      const killWallClock = Date.now();
      expect(runner.exitCode).toBeNull();
      runner.kill('SIGKILL');
      const runnerResult = await runnerClosed;
      runner = null;
      expect(runnerResult.signal).toBe('SIGKILL');
      const killedAfterRunnerStartMs = performance.now() - runnerStart;

      const checkpoint = await readCheckpoint(directory);
      if (!checkpoint) throw new Error('no checkpoint survived the crash');
      expect(checkpoint.generation).toBeGreaterThanOrEqual(2);
      const fileBytes = (await stat(join(directory, CHECKPOINT_FILE))).size;
      const checkpointAgeMs = killWallClock - Date.parse(checkpoint.writtenAt);
      const lastTickBeforeKill = lastProgressTick(runnerResult.stdout);
      const lostTicks = Math.max(0, lastTickBeforeKill - checkpoint.tick);

      const restoreStart = performance.now();
      const restorer = startChild('restore', directory);
      const restoreResult = await collect(restorer);
      const restoreWallMs = performance.now() - restoreStart;
      expect(restoreResult.code, restoreResult.stderr).toBe(0);
      const resultLine = restoreResult.stdout.split('\n').find((line) => line.startsWith('RESULT '));
      if (!resultLine) throw new Error(`restore printed no RESULT line: ${restoreResult.stderr}`);
      const restored = JSON.parse(resultLine.slice('RESULT '.length)) as {
        ok: boolean;
        restoreMs: number;
        readMs: number;
        parseMs: number;
        worldReplayMs: number;
        ledgerRestoreMs: number;
        childElapsedMs: number;
        checkpointGeneration: number;
        checkpointIntervalMs: number;
        tick: number;
        hash: string;
        checkpointHash: string;
        hashMatches: boolean;
        worldMatches: boolean;
        appliedSeqMatches: boolean;
        allIntentsReplayed: boolean;
        intentLogCount: number;
        appliedIntents: number;
        appliedSeq: { clientId: number; entityId: number; seq: number }[];
        ledgerTransactions: number;
        ledgerLogCount: number;
        ledgerChecksum: string;
        ledgerMatches: boolean;
        drift: string;
        fileBytes: number;
        datasetBytes: { world: number; intents: number; ledger: number };
      };

      console.log(`NETGATE_CRASH ${JSON.stringify({
        child: 'apps/server/test/netgate/crash-child.ts',
        crash: 'SIGKILL',
        checkpointIntervalMs: checkpoint.checkpointIntervalMs,
        publishedRpoMs: checkpoint.checkpointIntervalMs,
        rpoWithinGateMs: checkpoint.checkpointIntervalMs <= 60_000,
        measuredCheckpointAgeAtKillMs: Math.round(checkpointAgeMs),
        killedAfterRunnerStartMs: Math.round(killedAfterRunnerStartMs),
        lastProgressTickBeforeKill: lastTickBeforeKill,
        lostTicksAfterCheckpoint: lostTicks,
        checkpoint: {
          generation: checkpoint.generation,
          writtenAt: checkpoint.writtenAt,
          tick: checkpoint.tick,
          hash: checkpoint.hash,
          appliedSeq: checkpoint.clients.map((client) => ({ clientId: client.clientId, entityId: client.entityId, seq: client.appliedSeq })),
          intents: checkpoint.intents.length,
          ledgerTransactions: checkpoint.ledger.log.length,
        },
        dataset: {
          fileBytes,
          worldBytes: checkpoint.datasetBytes.world,
          intentBytes: checkpoint.datasetBytes.intents,
          ledgerBytes: checkpoint.datasetBytes.ledger,
          ticks: checkpoint.tick,
          intents: checkpoint.intents.length,
          ledgerTransactions: checkpoint.ledger.log.length,
        },
        restore: {
          ok: restored.ok,
          restoreMs: restored.restoreMs,
          processWallMs: Math.round(restoreWallMs * 1000) / 1000,
          childElapsedMs: restored.childElapsedMs,
          readMs: restored.readMs,
          parseMs: restored.parseMs,
          worldReplayMs: restored.worldReplayMs,
          ledgerRestoreMs: restored.ledgerRestoreMs,
          within3s: restored.restoreMs <= 3000,
          within3sProcessWall: restoreWallMs <= 3000,
          restoredTick: restored.tick,
          restoredHash: restored.hash,
          restoredAppliedSeq: restored.appliedSeq,
          drift: restored.drift,
        },
        runnerStderr: runnerResult.stderr.trim(),
      })}`);

      expect(restored.ok).toBe(true);
      expect(restored.hashMatches).toBe(true);
      expect(restored.worldMatches).toBe(true);
      expect(restored.appliedSeqMatches).toBe(true);
      expect(restored.allIntentsReplayed).toBe(true);
      expect(restored.ledgerMatches).toBe(true);
      expect(restored.drift).toBe('0');
      expect(restored.tick).toBe(checkpoint.tick);
      expect(restored.hash).toBe(checkpoint.hash);
      expect(restored.intentLogCount).toBe(checkpoint.intents.length);
      expect(restored.appliedIntents).toBe(checkpoint.intents.length);
      expect(restored.ledgerTransactions).toBe(checkpoint.ledger.log.length);
      expect(restored.ledgerChecksum).toBe(checkpoint.ledger.checksum);
      expect(restored.fileBytes).toBe(fileBytes);
      expect(restored.checkpointGeneration).toBe(checkpoint.generation);
      expect(checkpoint.checkpointIntervalMs).toBeLessThanOrEqual(60_000);
      expect(restored.checkpointIntervalMs).toBe(checkpoint.checkpointIntervalMs);
      expect(restored.restoreMs).toBeLessThanOrEqual(3000);
    } finally {
      if (runner && runner.exitCode === null) {
        runner.kill('SIGKILL');
        await new Promise<void>((resolve) => runner?.once('close', () => resolve()));
      }
      await rm(directory, { recursive: true, force: true });
    }
  }, 45_000);
});
