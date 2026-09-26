import type { createAdminAuthMiddleware } from '../middlewares/admin-auth.middleware';

export type AdminAuthMiddleware = ReturnType<typeof createAdminAuthMiddleware>;
