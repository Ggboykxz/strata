/**
 * @strata/protocol — wire contract between client and server.
 *
 * Two generations coexist on purpose:
 *   - `./tracer` — v1, JSON, the TRACER-001 walking skeleton. Kept until the game client moves to v2.
 *   - `./binary` — the binary frames, fixed little-endian layouts, version handshake, strict lengths. NET-002.
 *
 * A peer that does not speak the version it declares is refused (`reject`), never truncated into
 * something that parses. Adding a message class means bumping `PROTOCOL_VERSION` and the frame table;
 * `docs/STACK.lock.md` still forbids a schema library until it is pinned.
 */

export * from './anim';
export * from './binary';
export * from './delta';
export * from './tracer';
