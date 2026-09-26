import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from './interfaces/admin-auth-middleware.type';
import type { UseCases } from './interfaces/use-cases.interface';
import { overviewRoutes } from './routes/overview.routes';
import { usersRoutes } from './routes/users.routes';
import { policyRoutes } from './routes/policy.routes';
import { auditRoutes } from './routes/audit.routes';
import { moderationRoutes } from './routes/moderation.routes';
import { reportsAdminRoutes } from './routes/reports-admin.routes';

export const adminRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia({ prefix: '/api/admin' })
    .use(overviewRoutes(useCases, adminAuth))
    .use(usersRoutes(useCases, adminAuth))
    .use(policyRoutes(useCases, adminAuth))
    .use(auditRoutes(useCases, adminAuth))
    .use(moderationRoutes(useCases, adminAuth))
    .use(reportsAdminRoutes(useCases, adminAuth));
