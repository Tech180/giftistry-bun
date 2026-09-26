import { Elysia } from 'elysia';
import {
  SYSTEM_PUBLIC_SWAGGER_DETAIL,
} from '../constants/swagger-detail.constant';
import type { UseCases } from '../interfaces/use-cases.interface';
import { setupBodySchema } from '../schemas/setup-body.schema';
import { assertSetupToken } from '../utils/assert-setup-token.util';

export const publicRoutes = (useCases: UseCases) =>
  new Elysia()
    .get(
      '/status',
      async () => {
        const status = await useCases.getSystemStatus.execute();
        return { success: true, ...status };
      },
      { detail: { ...SYSTEM_PUBLIC_SWAGGER_DETAIL, summary: 'System status' } }
    )
    .post(
      '/setup',
      async ({ body: { Giftistry: { Setup } }, request }) => {
        assertSetupToken(request, Setup.SetupToken);
        await useCases.runInitialSetup.execute(Setup);
        return { success: true };
      },
      {
        body: setupBodySchema,
        detail: { ...SYSTEM_PUBLIC_SWAGGER_DETAIL, summary: 'Initial setup' },
      }
    );
