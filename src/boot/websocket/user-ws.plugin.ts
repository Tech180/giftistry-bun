import { Elysia, t, type AnyElysia } from 'elysia';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import { verifyToken } from '@/common/utils/token';
import {
  addUserWsConnection,
  removeUserWsConnection,
} from '@/modules/notifications/infrastructure/stores/user-ws.store';

export function createUserWsPlugin(userRepo: UserRepository): AnyElysia {
  return new Elysia()
    .ws('/ws/user', {
      query: t.Object({
        token: t.String()
      }),
      async open(ws: any) {
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

        const wsId = crypto.randomUUID();
        ws.data.wsId = wsId;
        ws.data.user = user;

        ws.subscribe(user.Id);
        addUserWsConnection(user.Id, wsId);
      },
      close(ws: any) {
        const user = ws.data.user;
        const wsId = ws.data.wsId;
        if (user?.Id && wsId) {
          removeUserWsConnection(user.Id, wsId);
        }
      }
    }) as AnyElysia;
}
