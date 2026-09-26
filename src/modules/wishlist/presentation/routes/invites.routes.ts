import { Elysia, t } from 'elysia';
import type { InvitesUseCases } from '@/modules/invites';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';

export const invitesRoutes = (
  inviteUseCases: InvitesUseCases,
  middleware: RouteMiddleware
) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .post(
      '/wishlists/:listId/link-invites',
      async ({
        params: { listId },
        getAuthUser,
        checkListAccess,
        body: {
          Giftistry: {
            Invites: { Role, ExpiresAt, MaxUses, Password },
          },
        },
      }) => {
        await checkListAccess('owner');
        const user = await getAuthUser();
        const result = await inviteUseCases.createLinkInvite.execute(
          listId,
          user.userId,
          Role ?? 'viewer',
          ExpiresAt ?? null,
          MaxUses ?? null,
          Password ?? null
        );
        return { success: true, data: result };
      },
      {
        body: t.Object({
          Giftistry: t.Object({
            Invites: t.Object({
              Role: t.Optional(t.Union([t.Literal('viewer'), t.Literal('collaborator')])),
              ExpiresAt: t.Optional(t.Nullable(t.String())),
              MaxUses: t.Optional(t.Nullable(t.Numeric())),
              Password: t.Optional(t.Nullable(t.String())),
            }),
          }),
        }),
        detail: { tags: ['Invites'], summary: 'Create link invite', security: [{ bearerAuth: [] }] },
      }
    )
    .get(
      '/wishlists/:listId/link-invites',
      async ({ params: { listId }, checkListAccess }) => {
        await checkListAccess('owner');
        const invites = await inviteUseCases.listLinkInvites.execute(listId);
        return { success: true, data: invites };
      },
      {
        detail: { tags: ['Invites'], summary: 'List link invites', security: [{ bearerAuth: [] }] },
      }
    )
    .delete(
      '/wishlists/:listId/link-invites/:inviteId',
      async ({ params: { listId, inviteId }, checkListAccess }) => {
        await checkListAccess('owner');
        await inviteUseCases.revokeLinkInvite.execute(listId, inviteId);
        return { success: true };
      },
      {
        detail: { tags: ['Invites'], summary: 'Revoke link invite', security: [{ bearerAuth: [] }] },
      }
    )
    .post(
      '/wishlists/:listId/email-invites',
      async ({
        params: { listId },
        getAuthUser,
        checkListAccess,
        body: {
          Giftistry: {
            Lists: { Email, Role },
          },
        },
      }) => {
        await checkListAccess('owner');
        const user = await getAuthUser();
        const result = await inviteUseCases.createEmailInvite.execute(listId, Email, Role, user.userId);
        return { success: true, data: result };
      },
      {
        body: t.Object({
          Giftistry: t.Object({
            Lists: t.Object({
              Email: t.String({ format: 'email' }),
              Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
            }),
          }),
        }),
        detail: { tags: ['Invites'], summary: 'Create email invite', security: [{ bearerAuth: [] }] },
      }
    );
