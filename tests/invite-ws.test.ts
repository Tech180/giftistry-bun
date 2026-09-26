import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../src/index';
import { guestListWsRoom } from '../src/modules/invites';
import { clearInviteWsRegistry } from '../src/modules/invites/infrastructure/stores/invite-ws.store';
import {
  cleanUpUser,
  cleanUpWishlist,
  createTestUser,
  createTestWishlist,
} from './helper';

function waitForOpen(ws: WebSocket, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), timeoutMs);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('WebSocket error'));
    });
  });
}

function waitForMessage(
  ws: WebSocket,
  predicate: (data: Record<string, unknown>) => boolean,
  timeoutMs = 5000
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket message timeout')), timeoutMs);
    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(String(event.data)) as Record<string, unknown>;
        if (predicate(data)) {
          clearTimeout(timer);
          ws.removeEventListener('message', onMessage);
          resolve(data);
        }
      } catch {
        /* ignore malformed */
      }
    };
    ws.addEventListener('message', onMessage);
  });
}

function waitForClose(ws: WebSocket, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error('WebSocket close timeout')), timeoutMs);
    ws.addEventListener('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

describe('Invite guest WebSocket', () => {
  let owner: { token: string; userId: string; email: string };
  let listId: string;
  let openToken: string;
  let passwordToken: string;
  let passwordInviteId: string;
  let server: ReturnType<typeof app.listen>;
  let port: number;

  beforeAll(async () => {
    const timestamp = Date.now();
    owner = await createTestUser(`invite_ws_owner_${timestamp}`, `invite_ws_owner_${timestamp}@example.com`);
    listId = await createTestWishlist(owner.token, 'Invite WS List');

    const openInviteRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: { Invites: { Role: 'viewer' } },
        }),
      })
    );
    const openInviteBody = await openInviteRes.json() as { Result: { Token: string } };
    openToken = openInviteBody.Result.Token;

    const passwordInviteRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/link-invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Invites: {
              Role: 'viewer',
              Password: 'inviteWsPass123',
            },
          },
        }),
      })
    );
    const passwordInviteBody = await passwordInviteRes.json() as {
      Result: { Token: string; Invite: { Id: string } };
    };
    passwordToken = passwordInviteBody.Result.Token;
    passwordInviteId = passwordInviteBody.Result.Invite.Id;

    clearInviteWsRegistry();
    server = app.listen(0);
    port = server.server?.port ?? 0;
    if (!port) {
      throw new Error('Failed to bind invite WS test server');
    }
  });

  afterAll(async () => {
    clearInviteWsRegistry();
    server.stop(true);
    await cleanUpWishlist(listId);
    await cleanUpUser(owner.userId);
  });

  test('preview advertises SupportsGuestRealtime', async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/invites/link/${openToken}/preview`)
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { Result: { SupportsGuestRealtime: boolean } };
    expect(body.Result.SupportsGuestRealtime).toBe(true);
  });

  test('open token receives list.changed on guest-list room publish', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/invite/${openToken}`);
    await waitForOpen(ws);

    const pending = waitForMessage(ws, (data) => data.Type === 'list.changed');
    // Allow subscribe to settle before topic publish.
    await Bun.sleep(50);
    app.server?.publish(
      guestListWsRoom(listId),
      JSON.stringify({ Type: 'list.changed', Reason: 'item.updated', ItemId: 'item-x' })
    );

    const message = await pending;
    expect(message).toEqual({
      Type: 'list.changed',
      Reason: 'item.updated',
      ItemId: 'item-x',
    });
    ws.close();
    await waitForClose(ws);
  });

  test('password token requires auth before receiving list.changed', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/invite/${passwordToken}`);
    await waitForOpen(ws);

    app.server?.publish(
      guestListWsRoom(listId),
      JSON.stringify({ Type: 'list.changed', Reason: 'item.created' })
    );
    await Bun.sleep(100);

    const authOk = waitForMessage(ws, (data) => data.Type === 'auth.ok');
    ws.send(JSON.stringify({ Type: 'auth', Password: 'inviteWsPass123' }));
    await authOk;

    const pending = waitForMessage(ws, (data) => data.Type === 'list.changed');
    await Bun.sleep(50);
    app.server?.publish(
      guestListWsRoom(listId),
      JSON.stringify({ Type: 'list.changed', Reason: 'item.created' })
    );
    const message = await pending;
    expect(message.Reason).toBe('item.created');
    ws.close();
    await waitForClose(ws);
  });

  test('wrong password closes the socket after auth.failed', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/invite/${passwordToken}`);
    await waitForOpen(ws);

    const failed = waitForMessage(ws, (data) => data.Type === 'auth.failed');
    const closed = waitForClose(ws);
    ws.send(JSON.stringify({ Type: 'auth', Password: 'wrong-password' }));
    await failed;
    await closed;
  });

  test('invalid token closes immediately', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/invite/not-a-real-token`);
    await waitForClose(ws);
  });

  test('revoke notifies connected guest and closes socket', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/invite/${passwordToken}`);
    await waitForOpen(ws);
    const authOk = waitForMessage(ws, (data) => data.Type === 'auth.ok');
    ws.send(JSON.stringify({ Type: 'auth', Password: 'inviteWsPass123' }));
    await authOk;

    const revoked = waitForMessage(ws, (data) => data.Type === 'invite.revoked');
    const closed = waitForClose(ws);

    const revokeRes = await app.handle(
      new Request(`http://localhost/api/wishlists/${listId}/link-invites/${passwordInviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${owner.token}` },
      })
    );
    expect(revokeRes.status).toBe(200);

    await revoked;
    await closed;
  });
});
