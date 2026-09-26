import { Elysia, t, type AnyElysia } from 'elysia';
import type { ListLinkTokenRepository } from '@/modules/invites';
import { loadValidLinkInvite } from '@/modules/invites/application/utils/load-valid-link-invite.util';
import { guestListWsRoom } from '@/modules/invites/infrastructure/utils/guest-list-ws-room.util';
import {
  addInviteWsConnection,
  removeInviteWsConnection,
} from '@/modules/invites/infrastructure/stores/invite-ws.store';

function parseInviteWsMessage(message: unknown): Record<string, unknown> | null {
  try {
    const data = typeof message === 'string' ? JSON.parse(message) : message;
    if (!data || typeof data !== 'object') {
      return null;
    }
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createInviteWsPlugin(linkTokenRepo: ListLinkTokenRepository): AnyElysia {
  return new Elysia()
    .ws('/ws/invite/:token', {
      params: t.Object({
        token: t.String(),
      }),
      async open(ws: any) {
        const { token } = ws.data.params;

        // Client may send auth as soon as the handshake completes; await this in message().
        let resolveReady!: () => void;
        ws.data.ready = new Promise<void>((resolve) => {
          resolveReady = resolve;
        });

        try {
          const linkInvite = await loadValidLinkInvite(linkTokenRepo, token);
          const wsId = crypto.randomUUID();
          const passwordRequired = !!linkInvite.PasswordHash;
          ws.data.wsId = wsId;
          ws.data.token = token;
          ws.data.listId = linkInvite.ListId;
          ws.data.passwordHash = linkInvite.PasswordHash;
          ws.data.passwordRequired = passwordRequired;
          ws.data.authenticated = !passwordRequired;

          addInviteWsConnection(token, wsId, {
            send: (data: string) => ws.send(data),
            close: () => ws.close(),
          });

          if (!passwordRequired) {
            ws.subscribe(guestListWsRoom(linkInvite.ListId));
          }
        } catch {
          setTimeout(() => {
            try {
              ws.close();
            } catch {
              /* ignore */
            }
          }, 0);
        } finally {
          resolveReady();
        }
      },
      async message(ws: any, message: any) {
        if (ws.data.ready) {
          await ws.data.ready;
        }

        // Invalid/expired invites never set passwordRequired — ignore frames until close.
        if (ws.data.passwordRequired !== true && ws.data.authenticated !== true) {
          return;
        }

        if (ws.data.authenticated || ws.data.passwordRequired !== true) {
          return;
        }

        const data = parseInviteWsMessage(message);
        if (!data || data.Type !== 'auth' || typeof data.Password !== 'string') {
          return;
        }

        const passwordHash = ws.data.passwordHash as string | null;
        if (!passwordHash) {
          ws.send(JSON.stringify({ Type: 'auth.failed' }));
          setTimeout(() => ws.close(), 0);
          return;
        }

        try {
          const isMatch = await Bun.password.verify(data.Password, passwordHash);
          if (!isMatch) {
            ws.send(JSON.stringify({ Type: 'auth.failed' }));
            setTimeout(() => ws.close(), 0);
            return;
          }

          ws.data.authenticated = true;
          ws.subscribe(guestListWsRoom(ws.data.listId as string));
          ws.send(JSON.stringify({ Type: 'auth.ok' }));
        } catch (err) {
          console.error('Error handling invite ws message:', err);
          ws.send(JSON.stringify({ Type: 'auth.failed' }));
          setTimeout(() => ws.close(), 0);
        }
      },
      close(ws: any) {
        const token = ws.data.token as string | undefined;
        const wsId = ws.data.wsId as string | undefined;
        if (token && wsId) {
          removeInviteWsConnection(token, wsId);
        }
      },
    }) as AnyElysia;
}
