import type { createAuthMiddleware } from '@/modules/auth';
import type { createListAccessMiddleware } from '@/common/middlewares/list-access.middleware';

export interface RouteMiddleware {
  auth: ReturnType<typeof createAuthMiddleware>;
  listAccess: ReturnType<typeof createListAccessMiddleware>;
}
