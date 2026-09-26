import { Elysia } from 'elysia';
import { INVITES_PUBLIC_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { InvitesRoutesDeps } from '../interfaces/invites-routes-deps.interface';
import { invitePasswordBodySchema } from '../schemas/invite-password-body.schema';
import { inviteTokenParamsSchema } from '../schemas/invite-token-params.schema';

export const linkPreviewRoutes = ({ useCases }: InvitesRoutesDeps) =>
  new Elysia()
    .get('/invites/link/:token/preview', async ({ params: { token } }) => {
      const preview = await useCases.getPublicLinkPreview.execute(token);
      return { success: true, data: preview };
    }, {
      params: inviteTokenParamsSchema,
      detail: {
        ...INVITES_PUBLIC_SWAGGER_DETAIL,
        summary: 'Preview a public list link as a guest',
      },
    })
    .post('/invites/link/:token/preview', async ({ params: { token }, body }) => {
      const preview = await useCases.getPublicLinkPreview.execute(
        token,
        body?.Giftistry?.Invites?.Password
      );
      return { success: true, data: preview };
    }, {
      params: inviteTokenParamsSchema,
      body: invitePasswordBodySchema,
      detail: {
        ...INVITES_PUBLIC_SWAGGER_DETAIL,
        summary: 'Preview a password-protected public list link as a guest',
      },
    });
