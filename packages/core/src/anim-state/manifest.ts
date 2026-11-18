/**
 * Clip-event manifest (NET-005). The data half of the animation state machine.
 *
 * A manifest is content, not code: it names clips, their archetype, their kind, their length in ticks and
 * the events the server must fire at an exact tick (hits, footsteps). It is validated on load, because a
 * malformed clip must be refused before a server can schedule a hit frame from it (I13).
 *
 * No dependency, no clock, no I/O: `packages/core` stays deterministic and lint-core-math enforces it.
 */

/** Highest clip id the v1 contract can carry (u16). */
export const MAX_CLIP_ID = 65_535;

/** Highest archetype id the v1 contract can carry (u8). */
export const MAX_ARCHETYPE_ID = 255;

/** Shortest and longest clip, in ticks. 600 ticks = 20 s at 30 Hz. */
export const MIN_CLIP_TICKS = 1;
export const MAX_CLIP_TICKS = 600;

export const CLIP_KINDS = ['locomotion', 'action'] as const;
export type ClipKind = (typeof CLIP_KINDS)[number];

export const CLIP_EVENT_KINDS = ['hit', 'footstep'] as const;
export type ClipEventKind = (typeof CLIP_EVENT_KINDS)[number];

export interface ClipEvent {
  /** Tick offset from the first tick of the clip, in `0..durationTicks-1`. */
  readonly tick: number;
  readonly kind: ClipEventKind;
}

export interface Clip {
  readonly id: number;
  readonly archetype: number;
  readonly kind: ClipKind;
  /** Length in ticks. A locomotion clip loops; an action clip ends and enters recovery. */
  readonly durationTicks: number;
  readonly loop: boolean;
  /** Sorted by (tick, kind order). Never two events with the same (tick, kind). */
  readonly events: readonly ClipEvent[];
}

export interface ClipManifest {
  readonly version: 1;
  readonly clips: readonly Clip[];
}

export type ManifestErrorCode =
  | 'not-object'
  | 'version'
  | 'clips'
  | 'duplicate-id'
  | 'bad-id'
  | 'bad-archetype'
  | 'bad-kind'
  | 'bad-duration'
  | 'bad-loop'
  | 'bad-events'
  | 'event-order';

/** Raised when a manifest cannot be trusted. Never repaired silently. */
export class ManifestError extends Error {
  constructor(readonly code: ManifestErrorCode, message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

function fail(code: ManifestErrorCode, message: string): never {
  throw new ManifestError(code, message);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function integer(value: unknown, min: number, max: number, field: string, code: ManifestErrorCode): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(code, `${field} must be an integer in ${min}..${max}, got ${String(value)}`);
  }
  return value;
}

function eventKind(value: unknown, field: string): ClipEventKind {
  if (value !== 'hit' && value !== 'footstep') {
    fail('bad-events', `${field} must be hit or footstep, got ${String(value)}`);
  }
  return value;
}

const kindRank = (kind: ClipEventKind): number => (kind === 'hit' ? 0 : 1);

function loadClip(raw: unknown, index: number): Clip {
  if (!isRecord(raw)) fail('not-object', `clips[${index}] must be an object`);
  const id = integer(raw.id, 1, MAX_CLIP_ID, `clips[${index}].id`, 'bad-id');
  const archetype = integer(raw.archetype, 1, MAX_ARCHETYPE_ID, `clips[${index}].archetype`, 'bad-archetype');

  const kind = raw.kind;
  if (kind !== 'locomotion' && kind !== 'action') {
    fail('bad-kind', `clips[${index}].kind must be locomotion or action, got ${String(kind)}`);
  }

  const durationTicks = integer(raw.durationTicks, MIN_CLIP_TICKS, MAX_CLIP_TICKS, `clips[${index}].durationTicks`, 'bad-duration');
  if (typeof raw.loop !== 'boolean') fail('bad-loop', `clips[${index}].loop must be a boolean`);
  if (kind === 'locomotion' && !raw.loop) fail('bad-loop', `clips[${index}] is locomotion and must loop`);
  if (kind === 'action' && raw.loop) fail('bad-loop', `clips[${index}] is an action and must not loop`);

  if (!Array.isArray(raw.events)) fail('bad-events', `clips[${index}].events must be an array`);
  const events: ClipEvent[] = [];
  let previousTick = -1;
  let previousRank = -1;
  for (let i = 0; i < raw.events.length; i++) {
    const candidate: unknown = raw.events[i];
    if (!isRecord(candidate)) fail('bad-events', `clips[${index}].events[${i}] must be an object`);
    const tick = integer(candidate.tick, 0, durationTicks - 1, `clips[${index}].events[${i}].tick`, 'bad-events');
    const event = eventKind(candidate.kind, `clips[${index}].events[${i}].kind`);
    const rank = kindRank(event);
    if (tick < previousTick || (tick === previousTick && rank <= previousRank)) {
      fail('event-order', `clips[${index}].events must be strictly ordered by (tick, kind)`);
    }
    previousTick = tick;
    previousRank = rank;
    events.push({ tick, kind: event });
  }

  return { id, archetype, kind, durationTicks, loop: raw.loop, events };
}

/** Validate an untrusted manifest. Throws ManifestError; never returns a partially trusted value. */
export function loadManifest(raw: unknown): ClipManifest {
  if (!isRecord(raw)) fail('not-object', 'manifest must be an object');
  if (raw.version !== 1) fail('version', `manifest.version must be 1, got ${String(raw.version)}`);
  if (!Array.isArray(raw.clips) || raw.clips.length === 0) {
    fail('clips', 'manifest.clips must be a non-empty array');
  }

  const seen = new Set<number>();
  const clips: Clip[] = [];
  for (let i = 0; i < raw.clips.length; i++) {
    const clip = loadClip(raw.clips[i], i);
    if (seen.has(clip.id)) fail('duplicate-id', `clip id ${clip.id} appears more than once`);
    seen.add(clip.id);
    clips.push(clip);
  }
  return { version: 1, clips };
}

export function clipById(manifest: ClipManifest, id: number): Clip | undefined {
  return manifest.clips.find((clip) => clip.id === id);
}

export interface TimedEvent {
  /** Absolute tick at which the event fires. */
  readonly tick: number;
  readonly kind: ClipEventKind;
}

/** Events of a clip at an absolute tick, given the tick the clip started. Empty when none. */
export function eventsAt(manifest: ClipManifest, clipId: number, startTick: number, tick: number): readonly TimedEvent[] {
  const clip = clipById(manifest, clipId);
  if (!clip) return [];
  const offset = tick - startTick;
  return clip.events.filter((event) => event.tick === offset).map((event) => ({ tick: tick, kind: event.kind }));
}
