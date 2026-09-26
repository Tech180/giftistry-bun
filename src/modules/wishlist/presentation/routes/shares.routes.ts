import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { UseCases } from '../interfaces/use-cases.interface';

export const sharesRoutes = (useCases: UseCases, middleware: RouteMiddleware) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .get(
      '/wishlists/:listId/shares',
      async ({ params: { listId }, checkListAccess }) => {
        await checkListAccess('viewer');
        const shares = await useCases.listListShares.execute(listId);
        return { success: true, data: shares };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'List wishlist shares',
          description: 'List users with access to a wishlist. Available to anyone who can view the list.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .patch(
      '/wishlists/:listId/shares/:shareId',
      async ({
        params: { listId, shareId },
        checkListAccess,
        body: {
          Giftistry: {
            Lists: { Role },
          },
        },
      }) => {
        await checkListAccess('owner');
        const share = await useCases.updateListShare.execute(listId, shareId, Role);
        return { success: true, data: share };
      },
      {
        body: t.Object({
          Giftistry: t.Object({
            Lists: t.Object({
              Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
            }),
          }),
        }),
        detail: {
          tags: ['Wishlists'],
          summary: 'Update share role',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .delete(
      '/wishlists/:listId/shares/:shareId',
      async ({ params: { listId, shareId }, checkListAccess }) => {
        await checkListAccess('owner');
        await useCases.removeListShare.execute(listId, shareId);
        return { success: true };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Remove share',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/wishlists/:listId/shares/bulk',
      async ({
        params: { listId },
        getAuthUser,
        checkListAccess,
        body: {
          Giftistry: {
            Lists: { FriendIds, Role },
          },
        },
      }) => {
        const user = await getAuthUser();
        await checkListAccess('owner');
        const shares = await useCases.bulkShareWishlist.execute(listId, user.userId, FriendIds, Role);
        return { success: true, data: shares };
      },
      {
        body: t.Object({
          Giftistry: t.Object({
            Lists: t.Object({
              FriendIds: t.Array(t.String()),
              Role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
            }),
          }),
        }),
        detail: {
          tags: ['Wishlists'],
          summary: 'Bulk share wishlist with friends',
          security: [{ bearerAuth: [] }],
        },
      }
    );
