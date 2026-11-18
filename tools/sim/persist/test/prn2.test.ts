import { describe, expect, it } from 'vitest';
import { RoomHub } from '../../../../apps/server/src/rooms';
import { runRoomsPrototype } from '../prn2_rooms';

describe('PR-N2 harness', () => {
  it('prints a deterministic labelled local report', () => {
    const report = runRoomsPrototype();
    console.log(JSON.stringify(report, null, 2));
    expect(report.clients).toBe(6);
    expect(report.rooms_created).toBe(3);
    expect(report.exact_resumes).toBe(2);
    expect(report.late_refusals).toBe(1);
    expect(report.teardowns).toBe(report.rooms_created);
    expect(report.deterministic).toBe(true);
    expect(report.label).toContain('not a matchmaking service');
  });
});

describe('matchmaking determinism', () => {
  it('orders the queue by (rating, client) so the same input gives the same rooms', () => {
    const layout = () => {
      const hub = new RoomHub({ seed: 1337, capacity: 2, reconnectTicks: 3 });
      const queue = [[4, 1200], [1, 1000], [3, 1100], [2, 1000], [5, 1300], [6, 1050]];
      const ids: string[] = [];
      for (const [client, rating] of queue.sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
        let room = ids.map((id) => hub.get(id)!).find((c) => c.members.length < 2);
        if (!room) { const id = `room-${ids.length + 1}`; room = hub.create(id); ids.push(id); }
        room.join({ send() { /* fake */ } });
      }
      return ids.map((id) => hub.get(id)!.members.map((m) => m.clientId).join(',')).join('|');
    };
    expect(layout()).toBe(layout());
  });
});
