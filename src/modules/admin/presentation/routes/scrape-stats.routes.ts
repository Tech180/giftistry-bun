import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from '../interfaces/admin-auth-middleware.type';
import type { UseCases } from '../interfaces/use-cases.interface';
import { ADMIN_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';

export const scrapeStatsRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia()
    .use(adminAuth)
    .get(
      '/scrape-stats',
      async ({ getAdminUser }) => {
        await getAdminUser();
        const stats = useCases.getScrapeStats.execute();
        return { success: true, data: stats };
      },
      {
        detail: {
          ...ADMIN_SWAGGER_DETAIL,
          summary: 'Scrape telemetry stats (stub)',
          description: 'Returns `{ Available: false }` until scrape events are stored for reporting.',
        },
      }
    );
