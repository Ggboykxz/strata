/**
 * NET-GATE reconnect-restore measurement (real loopback sockets).
 *
 * Four real `ws` clients play against a real `WebSocketServer` and a 30 Hz authoritative tick. Client 2
 * is terminated abruptly, then resumes with the handle issued by the room. The test asserts the exact
 * entity id, the authoritative hash at a tick both clients saw, and the per-entity applied seq. A late
 * handle is then refused after the 90-tick window.
 *
 * Honest scope: loopback only, no TLS, no authentication, no packet loss injection. The resume handle is
 * read from the authoritative room object because protocol v3 has no server-to-client handle frame.
 */
import { describe, expect, it } from 'vitest';
import type { SnapshotFrame } from '@strata/protocol';
import {
  SocketClient, TICK_MS, Ticker, attemptRefusedConnection, connectFour, entitySeq, now, round, settleEntitySeq,
  sleep, startLiveServer, waitForDisconnect, type LiveServer,
} from './support';

function entityIn(snapshot: SnapshotFrame, entityId: number) {
  const entity = snapshot.entities.find((candidate) => candidate.id === entityId);
  if (!entity) throw new Error(`snapshot tick ${snapshot.tick} has no entity ${entityId}`);
  return entity;
}

function latestCommonTick(a: SocketClient, b: SocketClient): number {
  let best = 0;
  for (const tick of a.snapshots.keys()) if (b.snapshots.has(tick) && tick > best) best = tick;
  return best;
}

describe('NET-GATE reconnect-restore on real sockets', () => {
  it('restores the same entity, hash and applied seq inside the reconnect window', async () => {
    const server: LiveServer = await startLiveServer({ roomId: 'reconnect', capacity: 4, reconnectTicks: 90 });
    const ticker = new Ticker(server.room);
    const clients: SocketClient[] = [];
    try {
      clients.push(...await connectFour(server));
      await ticker.waitTicks(5);
      expect(clients.every((client) => client.welcomed)).toBe(true);
      for (const client of clients) client.startIntents();

      await ticker.waitTicks(60);
      const target = clients[1];
      const peer = clients[2];
      if (!target || !peer) throw new Error('missing clients');

      const preTick = latestCommonTick(target, peer);
      const preTarget = target.snapshots.get(preTick);
      const prePeer = peer.snapshots.get(preTick);
      if (!preTarget || !prePeer) throw new Error('no pre-disconnect common snapshot');
      expect(preTarget.hash).toBe(prePeer.hash);
      expect(preTarget.entities).toEqual(prePeer.entities);

      const entityId = target.entityId;
      const clientId = target.clientId;
      target.paused = true;
      target.stopIntents();
      await target.terminate();
      const disconnectedAtTick = await waitForDisconnect(server.room, clientId);
      // Settle only after terminate: the server may apply intents that were already in flight when the
      // client vanished, so a pre-disconnect sample can be one intent behind the resumed snapshot.
      await ticker.waitTicks(disconnectedAtTick + 2);
      const appliedSeqAtDisconnect = entitySeq(server.room, entityId);
      const member = server.room.members.find((candidate) => candidate.clientId === clientId);
      if (!member) throw new Error('disconnected handle vanished immediately');
      const token = member.token;
      expect(member.entityId).toBe(entityId);

      await ticker.waitTicks(disconnectedAtTick + 5);
      const stillHeld = server.room.members.find((candidate) => candidate.clientId === clientId);
      expect(stillHeld?.entityId).toBe(entityId);
      expect(stillHeld?.socket).toBeNull();

      const resumeFloor = server.room.currentTick;
      const resumeStarted = now();
      await target.open(server.url(server.room.id, `token=${encodeURIComponent(token)}`));
      const openMs = now() - resumeStarted;
      const resumed = await target.waitForSnapshot(resumeFloor);
      const resumeLatencyMs = now() - resumeStarted;

      const restored = server.room.members.find((candidate) => candidate.clientId === clientId);
      expect(restored?.entityId).toBe(entityId);
      expect(restored?.clientId).toBe(clientId);
      expect(restored?.token).toBe(token);
      expect(restored?.socket).not.toBeNull();

      expect(entityIn(resumed, entityId).id).toBe(entityId);
      expect(entityIn(resumed, entityId).seq).toBe(appliedSeqAtDisconnect);
      expect(appliedSeqAtDisconnect).toBeGreaterThanOrEqual(entityIn(preTarget, entityId).seq);

      const peerAtResume = peer.snapshots.get(resumed.tick);
      expect(peerAtResume).toBeDefined();
      expect(resumed.hash).toBe(peerAtResume?.hash);
      expect(resumed.entities).toEqual(peerAtResume?.entities);
      expect(server.room.sim.hashAt(resumed.tick)).toBe(resumed.hash);

      target.paused = false;
      target.startIntents();
      await ticker.waitTicks(120);
      await sleep(50);
      const finalTick = latestCommonTick(target, peer);
      const finalTarget = target.snapshots.get(finalTick);
      const finalPeer = peer.snapshots.get(finalTick);
      expect(finalTarget?.hash).toBe(finalPeer?.hash);
      expect(finalTarget?.entities).toEqual(finalPeer?.entities);
      const finalEntity = entityIn(finalTarget!, entityId);
      expect(finalEntity.id).toBe(entityId);
      expect(finalEntity.seq).toBeGreaterThan(appliedSeqAtDisconnect);
      expect(ticker.ticks).toBeGreaterThanOrEqual(120);

      const rejected = ticker.events.filter((event) => event.kind === 'rejected-intent');
      const desyncs = ticker.events.filter((event) => event.kind === 'desync');
      console.log(`NETGATE_RECONNECT ${JSON.stringify({
        transport: `ws://127.0.0.1:${server.port}`,
        roomId: server.room.id,
        capacity: server.room.capacity,
        reconnectTicks: server.room.reconnectTicks,
        ticks: ticker.ticks,
        entityId,
        clientId,
        disconnectedAtTick,
        resumedAtTick: resumed.tick,
        resumeLatencyMs: round(resumeLatencyMs),
        upgradeMs: round(openMs),
        hashAtCommonTick: { tick: resumed.tick, hash: resumed.hash, matchesPeer: true, matchesServer: true },
        preDisconnectCommonTick: { tick: preTick, hash: preTarget.hash },
        appliedSeqAtDisconnect,
        appliedSeqOnResume: entityIn(resumed, entityId).seq,
        appliedSeqAtFinalTick: finalEntity.seq,
        intentsSent: clients.reduce((sum, client) => sum + client.seq, 0),
        rejectedIntents: rejected.length,
        desyncEvents: desyncs.length,
      })}`);
    } finally {
      ticker.stop();
      await Promise.all(clients.map((client) => client.close()));
      await server.close();
    }
  }, 30_000);

  it('refuses a late resume after the reconnect window', async () => {
    const server = await startLiveServer({ roomId: 'late-resume', capacity: 4, reconnectTicks: 90 });
    const ticker = new Ticker(server.room);
    const clients: SocketClient[] = [];
    try {
      clients.push(...await connectFour(server));
      await ticker.waitTicks(5);
      for (const client of clients) client.startIntents();
      await ticker.waitTicks(20);

      const target = clients[1];
      if (!target) throw new Error('missing client');
      target.paused = true;
      target.stopIntents();
      const entityId = target.entityId;
      const clientId = target.clientId;
      await sleep(TICK_MS * 2);
      await settleEntitySeq(server.room, entityId);
      await target.terminate();
      const disconnectedAtTick = await waitForDisconnect(server.room, clientId);
      const member = server.room.members.find((candidate) => candidate.clientId === clientId);
      if (!member) throw new Error('handle missing at disconnect');
      const token = member.token;

      await ticker.waitTicks(disconnectedAtTick + server.room.reconnectTicks + 1);
      expect(server.room.currentTick - disconnectedAtTick).toBeGreaterThan(server.room.reconnectTicks);
      expect(server.room.members.some((candidate) => candidate.clientId === clientId)).toBe(false);
      expect(server.room.members).toHaveLength(3);

      const attemptedTick = server.room.currentTick;
      const refused = await attemptRefusedConnection(server.url(server.room.id, `token=${encodeURIComponent(token)}`));
      const reject = refused.messages.find((message) => message.kind === 'reject');
      expect(refused.closed).toBe(true);
      expect(reject).toMatchObject({ kind: 'reject', reason: 'unauthorized' });
      expect(refused.messages.some((message) => message.kind === 'snapshot')).toBe(false);
      expect(server.room.phase).not.toBe('closed');
      expect(server.room.members).toHaveLength(3);

      console.log(`NETGATE_LATE_RESUME ${JSON.stringify({
        roomId: server.room.id,
        reconnectTicks: server.room.reconnectTicks,
        disconnectedAtTick,
        attemptedAtTick: attemptedTick,
        ticksLate: attemptedTick - disconnectedAtTick,
        refused: true,
        reason: reject?.kind === 'reject' ? reject.reason : 'missing',
        entityId,
        remainingMembers: server.room.members.length,
        roomPhaseAfterEviction: server.room.phase,
        phaseNote: 'room.ts does not recompute OPEN after evicting one handle while others stay attached',
      })}`);
    } finally {
      ticker.stop();
      await Promise.all(clients.map((client) => client.close()));
      await server.close();
    }
  }, 30_000);
});
