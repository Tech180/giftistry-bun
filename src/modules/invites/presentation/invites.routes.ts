import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import type { InvitesUseCases } from './invites-use-cases.interface';

export const inviteAcceptRoutes = (useCases: InvitesUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .post('/invites/link/:token/accept', async ({ getAuthUser, params: { token }, body }) => {
    const user = await getAuthUser();
    const password = body?.Giftistry?.Invites?.Password;
    const share = await useCases.acceptLinkInvite.execute(user.userId, token, password);
    return { success: true, data: share };
  }, {
    params: t.Object({ token: t.String() }),
    body: t.Optional(t.Object({
      Giftistry: t.Object({
        Invites: t.Object({
          Password: t.Optional(t.String()),
        }),
      }),
    })),
    detail: { tags: ['Invites'], summary: 'Accept link invite', security: [{ bearerAuth: [] }] }
  })
  .get('/invites/link/:token', async ({ params: { token } }) => {
    const details = await useCases.getLinkInviteDetails.execute(token);
    return { success: true, data: details };
  }, {
    params: t.Object({ token: t.String() }),
    detail: { tags: ['Invites'], summary: 'Get invite link details', security: [{ bearerAuth: [] }] }
  })
  .post('/invites/email/:token/accept', async ({ getAuthUser, params: { token } }) => {
    const user = await getAuthUser();
    const share = await useCases.acceptEmailInvite.execute(user.userId, token);
    return { success: true, data: share };
  }, {
    params: t.Object({ token: t.String() }),
    detail: { tags: ['Invites'], summary: 'Accept email invite', security: [{ bearerAuth: [] }] }
  });
