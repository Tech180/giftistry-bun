import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { SYSTEM_OWNER_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { UseCases } from '../interfaces/use-cases.interface';

export const pushPublicRoutes = (useCases: UseCases) =>
  new Elysia()
    .use(authMiddleware)
    .get(
      '/push-config/public',
      async ({ getAuthUser }) => {
        await getAuthUser();
        const data = useCases.getPushConfigPublic.execute();
        return { success: true, data };
      },
      {
        detail: {
          ...SYSTEM_OWNER_SWAGGER_DETAIL,
          summary: 'Public push config',
        },
      }
    );
