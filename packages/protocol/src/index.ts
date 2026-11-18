/**
 * @strata/protocol — wire contract between client and server.
 *
 * P0-003 skeleton: a version and nothing else. No message schemas, no codecs, no prediction.
 * NET-001 owns the first real message; adding one before NET-GATE would be netcode before the
 * gate that authorizes it (I2).
 */

/** Bumped whenever the wire format changes. Client and server refuse a mismatch. */
export const PROTOCOL_VERSION = 1;

export * from './tracer';
