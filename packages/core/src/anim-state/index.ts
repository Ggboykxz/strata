/**
 * Animation state machine and clip-event manifest (NET-005).
 *
 * The machine is server-authoritative and tick-driven; the manifest is validated before a hit frame can be
 * scheduled from it. Both are integer-only and dependency-free (I14).
 */
export * from './manifest';
export * from './machine';
