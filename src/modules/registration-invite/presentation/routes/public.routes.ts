import { Elysia } from 'elysia';
import { AUTH_SWAGGER_DETAIL } from '../constants/auth-swagger-detail.constant';
import type { RegistrationInviteRoutesDeps } from '../interfaces/registration-invite-routes-deps.interface';
import { tokenParamsSchema } from '../schemas/token-params.schema';

export const publicRoutes = ({ useCases }: RegistrationInviteRoutesDeps) =>
  new Elysia({ prefix: '/api/auth' }).get(
    '/registration-invite/:token',
    async ({ params: { token } }) => {
      const result = await useCases.validate.execute(token);
      return { success: true, ...result };
    },
    {
      params: tokenParamsSchema,
      detail: {
        ...AUTH_SWAGGER_DETAIL,
        summary: 'Validate registration invite token',
      },
    }
  );
