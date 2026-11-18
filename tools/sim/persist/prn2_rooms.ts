/**
 * PR-N2 local rooms harness (greybox): deterministic matchmaking, exact resume and room teardown.
 * In-process fake sockets only — no real matchmaking service, no database, no network RTT.
 */
import { RoomHub, type RoomClient, type RoomSocket } from '../../../apps/server/src/rooms';

export interface RoomsReport {
  readonly clients: number;
  readonly rooms_created: number;
  readonly exact_resumes: number;
  readonly late_refusals: number;
  readonly teardowns: number;
  readonly deterministic: boolean;
  readonly label: string;
}

interface QueuedClient {
  readonly client: number;
  readonly rating: number;
}

class FakeSocket implements RoomSocket {
  send(_data: Uint8Array): void { /* local harness: the room owns the truth */ }
}

function run() {
  const reconnectTicks = 3;
  const hub = new RoomHub({ seed: 1337, capacity: 2, reconnectTicks });
  const queue: readonly QueuedClient[] = [
    { client: 4, rating: 1200 },
    { client: 1, rating: 1000 },
    { client: 3, rating: 1100 },
    { client: 2, rating: 1000 },
    { client: 5, rating: 1300 },
    { client: 6, rating: 1050 },
  ];
  const ordered = [...queue].sort((a, b) => (a.rating - b.rating) || (a.client - b.client));
  const clients = new Map<number, { member: RoomClient; roomId: string }>();
  const roomIds: string[] = [];

  for (const entry of ordered) {
    let room = roomIds.map((id) => hub.get(id)!).find((candidate) => candidate.members.length < 2);
    if (!room) {
      const id = `room-${roomIds.length + 1}`;
      room = hub.create(id);
      roomIds.push(id);
    }
    const joined = room.join(new FakeSocket());
    if (joined) clients.set(entry.client, { member: joined, roomId: room.id });
  }
  for (let tick = 1; tick <= 4; tick++) for (const id of roomIds) hub.get(id)!.tick();

  // Two clients leave inside the window: the handle must restore the SAME entity and tick.
  let exactResumes = 0;
  for (const client of [1, 3]) {
    const { member, roomId } = clients.get(client)!;
    const room = hub.get(roomId)!;
    const entity = member.entityId;
    room.disconnect(member.clientId);
    room.tick();
    const resumed = hub.resume(roomId, member.token, new FakeSocket());
    if (resumed?.entityId === entity) exactResumes++;
  }

  // A handle used after the window is refused.
  const { member: late, roomId: lateRoomId } = clients.get(4)!;
  const lateRoom = hub.get(lateRoomId)!;
  lateRoom.disconnect(late.clientId);
  for (let tick = 0; tick <= reconnectTicks; tick++) lateRoom.tick();
  const lateRefused = hub.resume(lateRoomId, late.token, new FakeSocket()) === null ? 1 : 0;

  // Everyone leaves; every room is torn down after the window.
  for (const id of roomIds) {
    const room = hub.get(id)!;
    for (const member of room.members) room.disconnect(member.clientId);
  }
  for (let tick = 0; tick <= reconnectTicks; tick++) for (const id of roomIds) hub.get(id)?.tick();
  const teardowns = hub.sweep().length;

  return { rooms: roomIds.length, exactResumes, lateRefused, teardowns };
}

export function runRoomsPrototype(): RoomsReport {
  const a = run();
  const b = run();
  return {
    clients: 6,
    rooms_created: a.rooms,
    exact_resumes: a.exactResumes,
    late_refusals: a.lateRefused,
    teardowns: a.teardowns,
    deterministic: JSON.stringify(a) === JSON.stringify(b),
    label: 'local greybox rooms — not a matchmaking service',
  };
}
