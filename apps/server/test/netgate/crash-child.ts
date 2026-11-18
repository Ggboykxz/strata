/**
 * NET-GATE crash/RPO child process.
 *
 * `run <dir>`: a real Room with four joined clients, driven at 30 Hz, appending every intent to a log and
 * writing a single atomically-renamed checkpoint every 5 s. The process is expected to be SIGKILLed by the
 * parent test; there is no graceful shutdown path.
 *
 * `restore <dir>`: a fresh process that reads the last checkpoint, replays the intent log through a new
 * Room, restores the ledger checkpoint, verifies the hash/seq/balances and prints one JSON result line.
 *
 * Node runs this TypeScript file directly through the experimental type transform and the local module
 * resolver in ts-register.mjs. Nothing here is production persistence: no database, no WAL, no fsync
 * protocol beyond the single-file write+rename described above.
 */
import {
  closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { encodeFrame } from '@strata/protocol';
import {
  Ledger, makeCheckpoint, restoreCheckpoint, transfer, type Checkpoint,
} from '@strata/core';
import { Room, type RoomClient, type RoomSocket } from '../../src/rooms';

export const CHECKPOINT_INTERVAL_MS = 5000;
const TICK_MS = 1000 / 30;

interface LedgerTransactionJson {
  readonly key: string;
  readonly entries: readonly {
    readonly id: string;
    readonly debit: number;
    readonly credit: number;
    readonly minorUnits: string;
    readonly idempotencyKey: string;
  }[];
}

interface LedgerCheckpointJson {
  readonly version: 1;
  readonly tick: number;
  readonly checksum: string;
  readonly balances: readonly (readonly [number, string])[];
  readonly applied: readonly (readonly [string, string])[];
  readonly log: readonly LedgerTransactionJson[];
}

interface IntentRecord {
  readonly tick: number;
  readonly clientId: number;
  readonly entityId: number;
  readonly seq: number;
  readonly dx: -1 | 0 | 1;
  readonly dz: -1 | 0 | 1;
}

interface ClientRecord {
  readonly clientId: number;
  readonly entityId: number;
  readonly token: string;
  readonly appliedSeq: number;
}

interface CheckpointFile {
  readonly version: 1;
  readonly generation: number;
  readonly checkpointIntervalMs: number;
  readonly writtenAt: string;
  readonly roomId: string;
  readonly seed: number;
  readonly capacity: number;
  readonly reconnectTicks: number;
  readonly tick: number;
  readonly hash: string;
  readonly world: { readonly tick: number; readonly entities: readonly unknown[] };
  readonly clients: readonly ClientRecord[];
  readonly intents: readonly IntentRecord[];
  readonly ledger: LedgerCheckpointJson;
  readonly datasetBytes: { readonly world: number; readonly intents: number; readonly ledger: number };
}

class NullSocket implements RoomSocket {
  bytes = 0;
  send(data: Uint8Array): void { this.bytes += data.byteLength; }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function serializeLedger(checkpoint: Checkpoint): LedgerCheckpointJson {
  return {
    version: checkpoint.version,
    tick: checkpoint.tick,
    checksum: checkpoint.checksum,
    balances: checkpoint.balances,
    applied: checkpoint.applied,
    log: checkpoint.log.map((transaction) => ({
      key: transaction.key,
      entries: transaction.entries.map((entry) => ({
        id: entry.id,
        debit: entry.debit,
        credit: entry.credit,
        minorUnits: entry.minorUnits.toString(),
        idempotencyKey: entry.idempotencyKey,
      })),
    })),
  };
}

function deserializeLedger(raw: LedgerCheckpointJson): Checkpoint {
  return {
    version: raw.version,
    tick: raw.tick,
    checksum: raw.checksum,
    balances: raw.balances,
    applied: raw.applied,
    log: raw.log.map((transaction) => ({
      key: transaction.key,
      entries: transaction.entries.map((entry) => ({
        id: entry.id,
        debit: entry.debit,
        credit: entry.credit,
        minorUnits: BigInt(entry.minorUnits),
        idempotencyKey: entry.idempotencyKey,
      })),
    })),
  };
}

/** Write the whole checkpoint as one file, then rename over the previous one. POSIX rename is atomic. */
function atomicWrite(file: string, text: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  const fd = openSync(temporary, 'w');
  try {
    writeFileSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, file);
  const directory = openSync(dirname(file), 'r');
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}

function seedLedger(ledger: Ledger): number {
  let posted = 0;
  for (let index = 0; index < 10_000; index++) {
    const from = 10 + (index % 64);
    const to = 10 + ((index + 1) % 64);
    const key = `genesis-${index}`;
    const result = ledger.post({ key, entries: transfer(key, from, to, BigInt(1 + (index % 500))) });
    if (result !== 'posted') throw new Error(`genesis transaction ${index} was ${result}`);
    posted++;
  }
  return posted;
}

async function run(directory: string): Promise<void> {
  mkdirSync(directory, { recursive: true });
  const room = new Room('crash-room', { seed: 0x5eed, capacity: 4, reconnectTicks: 90 });
  const clients: RoomClient[] = [];
  for (let index = 0; index < 4; index++) {
    const client = room.join(new NullSocket());
    if (!client) throw new Error('room refused a join below capacity');
    clients.push(client);
  }
  const ledger = new Ledger();
  const genesisPosted = seedLedger(ledger);
  const intents: IntentRecord[] = [];
  let generation = 0;

  const writeCheckpoint = (): void => {
    generation++;
    const serializedLedger = serializeLedger(makeCheckpoint(ledger, room.currentTick));
    const clientRecords: ClientRecord[] = clients.map((client) => ({
      clientId: client.clientId,
      entityId: client.entityId,
      token: client.token,
      appliedSeq: room.sim.state.entities.find((entity) => entity.id === client.entityId)?.seq ?? -1,
    }));
    const datasetBytes = {
      world: Buffer.byteLength(JSON.stringify({ world: room.sim.state, clients: clientRecords })),
      intents: Buffer.byteLength(JSON.stringify(intents)),
      ledger: Buffer.byteLength(JSON.stringify(serializedLedger)),
    };
    const checkpoint: CheckpointFile = {
      version: 1,
      generation,
      checkpointIntervalMs: CHECKPOINT_INTERVAL_MS,
      writtenAt: new Date().toISOString(),
      roomId: room.id,
      seed: room.options.seed ?? 0,
      capacity: room.capacity,
      reconnectTicks: room.reconnectTicks,
      tick: room.currentTick,
      hash: room.hash,
      world: room.sim.state,
      clients: clientRecords,
      intents: [...intents],
      ledger: serializedLedger,
      datasetBytes,
    };
    const text = JSON.stringify(checkpoint);
    atomicWrite(join(directory, 'checkpoint.json'), text);
    process.stdout.write(`CHECKPOINT gen=${generation} tick=${checkpoint.tick} bytes=${Buffer.byteLength(text)}\n`);
  };

  process.stdout.write(`RUNNER genesisPosted=${genesisPosted} intervalMs=${CHECKPOINT_INTERVAL_MS}\n`);
  writeCheckpoint(); // generation 1 at tick 0: at least one complete checkpoint always exists

  const sequence = [0, 0, 0, 0];
  const startedAt = performance.now();
  let lastCheckpointAt = startedAt;
  let tickIndex = 0;
  for (;;) {
    const due = startedAt + (tickIndex + 1) * TICK_MS;
    const delay = due - performance.now();
    if (delay > 0) await sleep(delay);

    for (let index = 0; index < clients.length; index++) {
      const client = clients[index];
      if (!client) continue;
      const nextSeq = (sequence[index] ?? 0) + 1;
      sequence[index] = nextSeq;
      const dx: -1 | 0 | 1 = nextSeq % 3 === 0 ? 1 : nextSeq % 3 === 1 ? -1 : 0;
      const dz: -1 | 0 | 1 = nextSeq % 5 < 2 ? 1 : nextSeq % 5 < 4 ? -1 : 0;
      const accepted = room.handleBytes(client.clientId, encodeFrame({
        kind: 'intent', entity: client.entityId, seq: nextSeq, dx, dz, targetTick: room.currentTick + 1,
      }));
      if (!accepted) throw new Error(`intent ${client.entityId}/${nextSeq} was refused`);
      intents.push({ tick: room.currentTick, clientId: client.clientId, entityId: client.entityId, seq: nextSeq, dx, dz });
    }

    room.tick();
    tickIndex++;
    const ledgerKey = `tick-${tickIndex}`;
    ledger.post({
      key: ledgerKey,
      entries: transfer(ledgerKey, 10 + (tickIndex % 64), 10 + ((tickIndex + 3) % 64), BigInt(1 + (tickIndex % 97))),
    });
    process.stdout.write(`PROGRESS tick=${room.currentTick} hash=${room.hash}\n`);

    const stamp = performance.now();
    if (stamp - lastCheckpointAt >= CHECKPOINT_INTERVAL_MS) {
      writeCheckpoint();
      lastCheckpointAt = stamp;
    }
  }
}

function restore(directory: string): void {
  const startedAt = performance.now();
  const file = join(directory, 'checkpoint.json');

  const readStarted = performance.now();
  const text = readFileSync(file, 'utf8');
  const readMs = performance.now() - readStarted;

  const parseStarted = performance.now();
  const checkpoint = JSON.parse(text) as CheckpointFile;
  const parseMs = performance.now() - parseStarted;
  if (checkpoint.version !== 1) throw new Error(`unsupported checkpoint version ${String(checkpoint.version)}`);

  const worldStarted = performance.now();
  const room = new Room(checkpoint.roomId, {
    seed: checkpoint.seed,
    capacity: checkpoint.capacity,
    reconnectTicks: checkpoint.reconnectTicks,
  });
  const restoredClients: RoomClient[] = [];
  for (let index = 0; index < checkpoint.clients.length; index++) {
    const expected = checkpoint.clients[index];
    if (!expected) throw new Error(`checkpoint client ${index} missing`);
    const client = room.join(new NullSocket());
    if (!client) throw new Error('restore could not join a checkpointed client');
    if (client.clientId !== expected.clientId || client.entityId !== expected.entityId) {
      throw new Error(`client identity mismatch: got ${client.clientId}/${client.entityId}, expected ${expected.clientId}/${expected.entityId}`);
    }
    if (client.token !== expected.token) throw new Error(`token mismatch for client ${client.clientId}`);
    restoredClients.push(client);
  }
  const byClientId = new Map(restoredClients.map((client) => [client.clientId, client]));

  let cursor = 0;
  let appliedIntents = 0;
  for (let tick = 0; tick < checkpoint.tick; tick++) {
    while (cursor < checkpoint.intents.length && checkpoint.intents[cursor]?.tick === tick) {
      const intent = checkpoint.intents[cursor];
      if (!intent) break;
      const client = byClientId.get(intent.clientId);
      if (!client) throw new Error(`intent names unknown client ${intent.clientId}`);
      const accepted = room.handleBytes(client.clientId, encodeFrame({
        kind: 'intent', entity: intent.entityId, seq: intent.seq, dx: intent.dx, dz: intent.dz, targetTick: tick + 1,
      }));
      if (!accepted) throw new Error(`replay refused intent ${intent.entityId}/${intent.seq} at tick ${intent.tick}`);
      appliedIntents++;
      cursor++;
    }
    room.tick();
  }
  const worldReplayMs = performance.now() - worldStarted;

  const worldMatches = JSON.stringify(room.sim.state) === JSON.stringify(checkpoint.world);
  const hashMatches = room.hash === checkpoint.hash && room.currentTick === checkpoint.tick;
  const appliedSeqMatches = checkpoint.clients.every((expected) => {
    const entity = room.sim.state.entities.find((candidate) => candidate.id === expected.entityId);
    return entity?.seq === expected.appliedSeq;
  });
  const allIntentsReplayed = cursor === checkpoint.intents.length;

  const ledgerStarted = performance.now();
  const ledger = restoreCheckpoint(deserializeLedger(checkpoint.ledger));
  const ledgerRestoreMs = performance.now() - ledgerStarted;
  const snapshot = ledger.snapshot();
  const ledgerMatches = ledger.transactionCount === checkpoint.ledger.log.length
    && JSON.stringify(snapshot.balances) === JSON.stringify(checkpoint.ledger.balances)
    && JSON.stringify(snapshot.applied) === JSON.stringify(checkpoint.ledger.applied);

  const restoreMs = performance.now() - startedAt;
  const result = {
    ok: worldMatches && hashMatches && appliedSeqMatches && allIntentsReplayed && ledgerMatches
      && ledger.drift() === 0n,
    restoreMs: round(restoreMs),
    readMs: round(readMs),
    parseMs: round(parseMs),
    worldReplayMs: round(worldReplayMs),
    ledgerRestoreMs: round(ledgerRestoreMs),
    childElapsedMs: round(performance.now()),
    checkpointGeneration: checkpoint.generation,
    checkpointWrittenAt: checkpoint.writtenAt,
    checkpointIntervalMs: checkpoint.checkpointIntervalMs,
    fileBytes: statSync(file).size,
    datasetBytes: checkpoint.datasetBytes,
    tick: room.currentTick,
    hash: room.hash,
    checkpointHash: checkpoint.hash,
    hashMatches,
    worldMatches,
    appliedSeqMatches,
    allIntentsReplayed,
    intentLogCount: checkpoint.intents.length,
    appliedIntents,
    appliedSeq: checkpoint.clients.map((client) => ({ clientId: client.clientId, entityId: client.entityId, seq: client.appliedSeq })),
    ledgerTransactions: ledger.transactionCount,
    ledgerLogCount: checkpoint.ledger.log.length,
    ledgerChecksum: checkpoint.ledger.checksum,
    ledgerMatches,
    drift: ledger.drift().toString(),
  };
  process.stdout.write(`RESULT ${JSON.stringify(result)}\n`);
  if (!result.ok) process.exitCode = 1;
}

const mode = process.argv[2];
const directory = process.argv[3];
if (!mode || !directory) {
  process.stderr.write('usage: crash-child.ts <run|restore> <directory>\n');
  process.exitCode = 2;
} else if (mode === 'run') {
  run(directory).catch((error: unknown) => {
    process.stderr.write(`RUN FAILED ${String(error)}\n`);
    process.exitCode = 1;
  });
} else if (mode === 'restore') {
  try {
    restore(directory);
  } catch (error) {
    process.stderr.write(`RESTORE FAILED ${String(error)}\n`);
    process.exitCode = 1;
  }
} else {
  process.stderr.write(`unknown mode ${mode}\n`);
  process.exitCode = 2;
}
