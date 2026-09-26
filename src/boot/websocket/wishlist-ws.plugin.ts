import { Elysia, t, type AnyElysia } from 'elysia';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import { verifyToken } from '@/common/utils/token';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import {
  addWishlistWsConnection,
  removeWishlistWsConnection,
} from '@/modules/wishlist/infrastructure/stores/wishlist-ws.store';
import { publishPresence } from '@/boot/utils/publish-wishlist-presence.util';

export function createWishlistWsPlugin(userRepo: UserRepository): AnyElysia {
  return new Elysia()
    .ws('/ws/wishlist/:listId', {
      query: t.Object({
        token: t.String()
      }),
      async open(ws: any) {
        const { listId } = ws.data.params;
        const { token } = ws.data.query;

        const payload = await verifyToken(token);
        if (!payload) {
          ws.close();
          return;
        }

        const user = await userRepo.findById(payload.userId);
        if (!user) {
          ws.close();
          return;
        }

        try {
          await getListAccessContext(user.Id, { listId });
        } catch (err) {
          ws.close();
          return;
        }

        const wsId = crypto.randomUUID();
        ws.data.wsId = wsId;
        ws.data.user = user;

        ws.subscribe(listId);

        addWishlistWsConnection(listId, wsId, {
          username: user.Username,
          userId: user.Id,
          send: (data: string) => ws.send(data),
        });

        publishPresence(listId, ws);
      },
      message(ws: any, message: any) {
        const { listId } = ws.data.params;
        try {
          const data = typeof message === 'string' ? JSON.parse(message) : message;
          if (data && data.Type === 'typing') {
            const user = ws.data.user;
            if (user) {
              ws.publish(listId, JSON.stringify({
                Type: 'typing',
                UserId: user.Id,
                Username: user.Username,
                IsTyping: !!data.IsTyping,
              }));
            }
          }
        } catch (err) {
          console.error('Error handling ws message:', err);
        }
      },
      close(ws: any) {
        const { listId } = ws.data.params;
        const wsId = ws.data.wsId;
        if (wsId && removeWishlistWsConnection(listId, wsId)) {
          publishPresence(listId, ws);
        }
      }
    }) as AnyElysia;
}
