import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { INVITES_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { InvitesRoutesDeps } from '../interfaces/invites-routes-deps.interface';
import { inviteTokenParamsSchema } from '../schemas/invite-token-params.schema';

export const emailAcceptRoutes = ({ useCases }: InvitesRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .post('/invites/email/:token/accept', async ({ getAuthUser, params: { token } }) => {
      const user = await getAuthUser();
      const share = await useCases.acceptEmailInvite.execute(user.userId, token);
      return { success: true, data: share };
    }, {
      params: inviteTokenParamsSchema,
      detail: {
        ...INVITES_SWAGGER_DETAIL,
        summary: 'Accept email invite',
      },
    });
