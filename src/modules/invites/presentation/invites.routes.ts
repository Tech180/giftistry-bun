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

export const wishlistInviteRoutes = (useCases: InvitesUseCases) => new Elysia()
  .post('/wishlists/:listId/link-invites', async ({ params: { listId }, getAuthUser, checkListAccess, body }) => {
    await checkListAccess('owner');
    const user = await getAuthUser();
    const result = await useCases.createLinkInvite.execute(
      listId,
      user.userId,
      body.role ?? 'viewer',
      body.expiresAt ?? null,
      body.maxUses ?? null
    );
    return { success: true, data: result };
  }, {
    body: t.Object({
      role: t.Optional(t.Union([t.Literal('viewer'), t.Literal('collaborator')])),
      expiresAt: t.Optional(t.Nullable(t.String())),
      maxUses: t.Optional(t.Nullable(t.Numeric())),
    }),
    detail: { tags: ['Invites'], summary: 'Create link invite', security: [{ bearerAuth: [] }] }
  })
  .get('/wishlists/:listId/link-invites', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    const invites = await useCases.listLinkInvites.execute(listId);
    return { success: true, data: invites };
  }, {
    detail: { tags: ['Invites'], summary: 'List link invites', security: [{ bearerAuth: [] }] }
  })
  .delete('/wishlists/:listId/link-invites/:inviteId', async ({ params: { listId, inviteId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.revokeLinkInvite.execute(listId, inviteId);
    return { success: true };
  }, {
    params: t.Object({ listId: t.String(), inviteId: t.String() }),
    detail: { tags: ['Invites'], summary: 'Revoke link invite', security: [{ bearerAuth: [] }] }
  })
  .post('/wishlists/:listId/email-invites', async ({ params: { listId }, getAuthUser, checkListAccess, body: { Giftistry: { Lists: { email, role } } } }) => {
    await checkListAccess('owner');
    const user = await getAuthUser();
    const result = await useCases.createEmailInvite.execute(listId, email, role, user.userId);
    return { success: true, data: result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          email: t.String({ format: 'email' }),
          role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
        })
      })
    }),
    detail: { tags: ['Invites'], summary: 'Create email invite', security: [{ bearerAuth: [] }] }
  });
