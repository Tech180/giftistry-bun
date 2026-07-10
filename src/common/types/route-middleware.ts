import type { createAuthMiddleware } from '@/modules/auth/presentation/auth.routes';
import type { createListAccessMiddleware } from '@/common/middlewares/list-access.middleware';

export type RouteMiddleware = {
  auth: ReturnType<typeof createAuthMiddleware>;
  listAccess: ReturnType<typeof createListAccessMiddleware>;
};
