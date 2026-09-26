import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { SYSTEM_OWNER_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { UseCases } from '../interfaces/use-cases.interface';
import { transferOwnershipBodySchema } from '../schemas/transfer-ownership-body.schema';

export const ownershipRoutes = (useCases: UseCases) =>
  new Elysia()
    .use(authMiddleware)
    .post(
      '/transfer-ownership',
      async ({ getAuthUser, body: { Giftistry: { Ownership: payload } }, request }) => {
        const actor = await getAuthUser();
        const result = await useCases.transferOwnership.execute(
          actor.Id,
          payload?.UserId ?? '',
          request.headers.get('x-forwarded-for')
        );
        return { success: true, ...result };
      },
      {
        body: transferOwnershipBodySchema,
        detail: { ...SYSTEM_OWNER_SWAGGER_DETAIL, summary: 'Transfer ownership' },
      }
    )
    .post(
      '/delete-server',
      async ({ getAuthUser, request }) => {
        const actor = await getAuthUser();
        await useCases.deleteServer.execute(
          actor.Id,
          actor.Username,
          request.headers.get('x-forwarded-for')
        );
        return { success: true };
      },
      { detail: { ...SYSTEM_OWNER_SWAGGER_DETAIL, summary: 'Delete server' } }
    );
