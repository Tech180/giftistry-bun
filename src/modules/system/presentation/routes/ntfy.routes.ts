import { Elysia } from 'elysia';
import { ownerAuthMiddleware } from '@/modules/auth';
import { SYSTEM_OWNER_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { UseCases } from '../interfaces/use-cases.interface';

export const ntfyRoutes = (useCases: UseCases) =>
  new Elysia()
    .use(ownerAuthMiddleware)
    .post(
      '/test-ntfy',
      async ({ getOwnerUser }) => {
        await getOwnerUser();
        const data = await useCases.testNtfy.execute();
        return { success: true, data };
      },
      {
        detail: {
          ...SYSTEM_OWNER_SWAGGER_DETAIL,
          summary: 'Publish ntfy test message',
        },
      }
    );
