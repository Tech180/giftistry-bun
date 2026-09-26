import { Elysia } from 'elysia';
import type { createAuthMiddleware } from '@/modules/auth/presentation/middlewares/auth.middleware';
import { AdminUser } from '../../domain/admin-user.entity';

/** Compose after `createAuthModule` — do not call at module import time (TDZ on authMiddleware). */
export function createAdminAuthMiddleware(auth: ReturnType<typeof createAuthMiddleware>) {
  return new Elysia()
    .use(auth)
    .derive({ as: 'global' }, ({ getAuthUser }) => ({
      getAdminUser: async () => {
        const user = await getAuthUser();
        AdminUser.assertAdmin(user);
        return user;
      },
    }));
}
