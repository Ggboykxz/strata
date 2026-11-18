/**
 * GATE:NET prototype — file-backed security counters.
 *
 * The SEC-001 gate keeps rejection counts and its per-client rate window in memory. This harness wraps the
 * same `MessageGate` with a JSON store so the measurements can answer one narrower question: do the counters
 * survive a process-level restart? It is a single-writer, single-node file prototype. It is NOT Redis, not a
 * distributed limiter and not durable under concurrent writers.
 *
 * Every write goes to a temporary file, is fsynced, then atomically renamed over the target. The file mode is
 * 0600. A corrupt or unreadable file fails closed instead of silently resetting the counters.
 *
 * Sequence-number anti-replay state is deliberately not persisted here; only reject counters, the rate window
 * and the audit entries are. That gap is recorded in the prototype report.
 */
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  AuditLog,
  MAX_INTENTS_PER_WINDOW,
  MessageGate,
  WINDOW_TICKS,
  makeAuditEntry,
  type AuditEntry,
  type GateVerdict,
  type RateLimiter,
  type RejectionReason,
} from '../../src/validation';

const REASONS: readonly RejectionReason[] = [
  'malformed',
  'unknown-kind',
  'wrong-version',
  'client-snapshot',
  'rate-limited',
  'non-monotonic-seq',
];

interface RateCounter {
  window: number;
  count: number;
}

export interface PersistentState {
  version: 1;
  rejections: Record<string, number>;
  rate: Record<string, RateCounter>;
  audit: AuditEntry[];
}

export class PersistentSecurityStore {
  private constructor(readonly file: string, readonly data: PersistentState) {}

  static open(file: string): PersistentSecurityStore {
    return new PersistentSecurityStore(file, loadState(file));
  }

  save(): void {
    atomicWriteJson(this.file, this.data);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isAuditEntry(value: unknown): value is AuditEntry {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && value.id.length > 0
    && isNonNegativeInt(value.actor)
    && isNonNegativeInt(value.tick)
    && typeof value.action === 'string' && value.action.length > 0
    && typeof value.reason === 'string' && value.reason.trim().length > 0
    && typeof value.hash === 'string' && /^[0-9a-f]{8}$/.test(value.hash);
}

function loadState(file: string): PersistentState {
  if (!existsSync(file)) return { version: 1, rejections: {}, rate: {}, audit: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`persistent security state is unreadable: ${String(error)}`);
  }
  if (!isRecord(parsed) || parsed.version !== 1) {
    throw new Error('persistent security state has an unsupported version');
  }

  const rejections: Record<string, number> = {};
  if (!isRecord(parsed.rejections)) throw new Error('persistent security state has invalid rejections');
  for (const [reason, count] of Object.entries(parsed.rejections)) {
    if (!REASONS.includes(reason as RejectionReason) || !isNonNegativeInt(count)) {
      throw new Error(`persistent security state has an invalid rejection counter: ${reason}`);
    }
    if (count > 0) rejections[reason] = count;
  }

  const rate: Record<string, RateCounter> = {};
  if (!isRecord(parsed.rate)) throw new Error('persistent security state has an invalid rate table');
  for (const [client, counter] of Object.entries(parsed.rate)) {
    if (!/^\d+$/.test(client) || !isRecord(counter)
      || !isNonNegativeInt(counter.window) || !isNonNegativeInt(counter.count)
      || counter.count > MAX_INTENTS_PER_WINDOW) {
      throw new Error(`persistent security state has an invalid rate counter: ${client}`);
    }
    const clientId = Number(client);
    if (!Number.isSafeInteger(clientId)) throw new Error(`persistent security state has an invalid client id: ${client}`);
    rate[client] = { window: counter.window, count: counter.count };
  }

  if (!Array.isArray(parsed.audit) || !parsed.audit.every(isAuditEntry)) {
    throw new Error('persistent security state has invalid audit entries');
  }

  return {
    version: 1,
    rejections,
    rate,
    audit: parsed.audit.map((entry) => Object.freeze({ ...entry })),
  };
}

function fsyncDirectory(directory: string): void {
  let fd: number | undefined;
  try {
    fd = openSync(directory, 'r');
    fsyncSync(fd);
  } catch {
    // Some filesystems refuse directory fsync. The rename is still atomic; the report records this limit.
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function atomicWriteJson(file: string, value: unknown): void {
  const directory = dirname(file);
  mkdirSync(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  let fd: number | undefined;
  try {
    fd = openSync(temporary, 'wx', 0o600);
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, file);
    fsyncDirectory(directory);
  } catch (error) {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* already closed */ }
    }
    try { unlinkSync(temporary); } catch { /* rename succeeded or never created */ }
    throw error;
  }
}

/** Same fixed-window semantics as `RateLimiter`, with the counter table persisted after every verdict. */
class FileRateLimiter {
  private readonly counters = new Map<number, RateCounter>();

  constructor(private readonly store: PersistentSecurityStore) {
    for (const [client, counter] of Object.entries(store.data.rate)) {
      this.counters.set(Number(client), { window: counter.window, count: counter.count });
    }
  }

  check(client: number, tick: number): 'allowed' | 'rate-limited' {
    if (!Number.isInteger(client) || client < 0 || !Number.isInteger(tick) || tick < 0) {
      throw new RangeError('client and tick must be non-negative integers');
    }
    const window = Math.floor(tick / WINDOW_TICKS);
    const counter = this.counters.get(client) ?? { window, count: 0 };
    if (counter.window !== window) { counter.window = window; counter.count = 0; }
    if (counter.count >= MAX_INTENTS_PER_WINDOW) {
      this.counters.set(client, counter);
      this.persist();
      return 'rate-limited';
    }
    counter.count++;
    this.counters.set(client, counter);
    this.persist();
    return 'allowed';
  }

  reset(client: number): void {
    if (this.counters.delete(client)) this.persist();
  }

  get trackedClients(): number { return this.counters.size; }

  private persist(): void {
    const rate: Record<string, RateCounter> = {};
    for (const [client, counter] of this.counters) {
      rate[String(client)] = { window: counter.window, count: counter.count };
    }
    this.store.data.rate = rate;
    this.store.save();
  }
}

/**
 * A `MessageGate` plus persisted rejection/rate counters and audit entries. Restarting means constructing a
 * new instance over the same file; the in-memory sequence map is not restored (see the file header).
 */
export class PersistentSecurity {
  private readonly store: PersistentSecurityStore;
  private readonly gate: MessageGate;
  private readonly rejectionCounts = new Map<RejectionReason, number>();
  private readonly audit = new AuditLog();

  constructor(readonly file: string) {
    this.store = PersistentSecurityStore.open(file);
    for (const [reason, count] of Object.entries(this.store.data.rejections)) {
      this.rejectionCounts.set(reason as RejectionReason, count);
    }
    for (const entry of this.store.data.audit) {
      this.audit.add({ ok: true, entry: Object.freeze({ ...entry }) });
    }
    this.gate = new MessageGate(new FileRateLimiter(this.store) as unknown as RateLimiter);
  }

  accept(client: number, tick: number, bytes: Uint8Array): GateVerdict {
    const verdict = this.gate.accept(client, tick, bytes);
    if (!verdict.allowed && verdict.reason) {
      this.rejectionCounts.set(verdict.reason, (this.rejectionCounts.get(verdict.reason) ?? 0) + 1);
      this.store.data.rejections = Object.fromEntries(this.rejectionCounts);
      this.store.save();
    }
    return verdict;
  }

  forget(client: number): void { this.gate.forget(client); }

  get counts(): ReadonlyMap<RejectionReason, number> { return new Map(this.rejectionCounts); }
  get rejected(): number { return [...this.rejectionCounts.values()].reduce((sum, count) => sum + count, 0); }

  /** Persist an accepted GM audit entry; a missing reason is refused before any write. */
  auditAction(actor: number, tick: number, action: string, reason: string): boolean {
    const verdict = makeAuditEntry(actor, tick, action, reason);
    if (!this.audit.add(verdict)) return false;
    this.store.data.audit = [...this.audit.list];
    this.store.save();
    return true;
  }

  get auditEntries(): readonly AuditEntry[] { return this.audit.list; }
}
