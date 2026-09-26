import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { INVITES_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { InvitesRoutesDeps } from '../interfaces/invites-routes-deps.interface';
import { invitePasswordBodySchema } from '../schemas/invite-password-body.schema';
import { inviteTokenParamsSchema } from '../schemas/invite-token-params.schema';

export const linkAcceptRoutes = ({ useCases }: InvitesRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .post('/invites/link/:token/accept', async ({ getAuthUser, params: { token }, body }) => {
      const user = await getAuthUser();
      const share = await useCases.acceptLinkInvite.execute(
        user.userId,
        token,
        body?.Giftistry?.Invites?.Password
      );
      return { success: true, data: share };
    }, {
      params: inviteTokenParamsSchema,
      body: invitePasswordBodySchema,
      detail: {
        ...INVITES_SWAGGER_DETAIL,
        summary: 'Accept link invite',
      },
    })
    .get('/invites/link/:token', async ({ params: { token } }) => {
      const details = await useCases.getLinkInviteDetails.execute(token);
      return { success: true, data: details };
    }, {
      params: inviteTokenParamsSchema,
      detail: {
        ...INVITES_SWAGGER_DETAIL,
        summary: 'Get invite link details',
      },
    });
