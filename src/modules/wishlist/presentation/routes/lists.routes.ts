import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { UseCases } from '../interfaces/use-cases.interface';

export const listsRoutes = (useCases: UseCases, middleware: RouteMiddleware) =>
  new Elysia()
    .use(middleware.auth)
    .get(
      '/wishlists/expired',
      async () => {
        const expired = await useCases.listExpiredWishlists.execute();
        return { success: true, data: expired };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Get expired wishlists',
          description: 'Fetch all active wishlists that have expired. Useful for cron jobs.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/wishlists',
      async ({
        getAuthUser,
        body: {
          Giftistry: {
            Lists: {
              Title,
              ExpiresAt,
              AllowGroupFunds,
              Category,
              RevealSuggestions,
              AiEnabled,
              WebSearchEnabled,
              ManualJobBackground,
              AutoRollover,
            },
          },
        },
      }) => {
        const user = await getAuthUser();
        const wishlist = await useCases.createWishlist.execute(
          user.userId,
          Title,
          ExpiresAt,
          AllowGroupFunds ?? false,
          Category,
          RevealSuggestions,
          AiEnabled,
          WebSearchEnabled,
          ManualJobBackground,
          AutoRollover
        );
        return { success: true, data: wishlist };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Create a new wishlist',
          description: 'Creates a new registry list for the authenticated user.',
          security: [{ bearerAuth: [] }],
        },
        body: t.Object({
          Giftistry: t.Object({
            Lists: t.Object({
              Title: t.String(),
              ExpiresAt: t.Optional(t.Nullable(t.String())),
              AllowGroupFunds: t.Optional(t.Boolean()),
              Category: t.Optional(t.String()),
              RevealSuggestions: t.Optional(t.Boolean()),
              AiEnabled: t.Optional(t.Boolean()),
              WebSearchEnabled: t.Optional(t.Boolean()),
              ManualJobBackground: t.Optional(t.Boolean()),
              AutoRollover: t.Optional(t.Boolean()),
            }),
          }),
        }),
      }
    )
    .get(
      '/wishlists',
      async ({ getAuthUser, query }) => {
        const user = await getAuthUser();
        const wishlists = await useCases.listWishlists.execute(user.userId, {
          bucket: (query.bucket as 'my' | 'shared' | 'archive' | 'all' | undefined) ?? 'all',
          q: query.q ?? '',
        });
        return { success: true, data: wishlists };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'List user wishlists',
          description:
            'Fetch wishlists for the authenticated user. Optional bucket (my|shared|archive|all) and q search filter. Always includes Counts for all buckets.',
          security: [{ bearerAuth: [] }],
        },
        query: t.Object({
          bucket: t.Optional(
            t.Union([
              t.Literal('my'),
              t.Literal('shared'),
              t.Literal('archive'),
              t.Literal('all'),
            ])
          ),
          q: t.Optional(t.String()),
        }),
      }
    )
    .use(middleware.listAccess)
    .get(
      '/wishlists/:listId',
      async ({ params: { listId }, checkListAccess }) => {
        const access = await checkListAccess('viewer');
        const wishlist = await useCases.getWishlist.execute(listId);
        if (wishlist) {
          wishlist.Role = access.role;
        }
        return { success: true, data: wishlist };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Get wishlist by ID',
          description: 'Retrieve a specific wishlist and its items. Requires appropriate access role.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .put(
      '/wishlists/:listId/deactivate',
      async ({ params: { listId }, checkListAccess }) => {
        await checkListAccess('owner');
        await useCases.deactivateWishlist.execute(listId);
        return { success: true };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Deactivate a wishlist',
          description: 'Deactivate and archive a wishlist by ID. Only allowed for the owner.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .put(
      '/wishlists/:listId/activate',
      async ({ params: { listId }, checkListAccess }) => {
        await checkListAccess('owner');
        const wishlist = await useCases.activateWishlist.execute(listId);
        return { success: true, data: wishlist };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Activate a wishlist',
          description:
            'Reactivate (un-archive) a wishlist by ID. If the expiry date is still in the past, clears expiration so the list does not immediately re-archive. Only allowed for the owner.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .put(
      '/wishlists/:listId',
      async ({
        params: { listId },
        checkListAccess,
        body: {
          Giftistry: {
            Lists: {
              Title,
              ExpiresAt,
              AllowGroupFunds,
              Category,
              RevealSuggestions,
              AiEnabled,
              WebSearchEnabled,
              ManualJobBackground,
              AutoRollover,
            },
          },
        },
      }) => {
        await checkListAccess('owner');
        const updated = await useCases.updateWishlist.execute(
          listId,
          Title,
          ExpiresAt,
          AllowGroupFunds ?? false,
          Category,
          RevealSuggestions,
          AiEnabled,
          WebSearchEnabled,
          ManualJobBackground,
          AutoRollover
        );
        return { success: true, data: updated };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Update/Rename a wishlist',
          description:
            'Update the title, expiration, and group funds settings of a wishlist. Only allowed for the owner.',
          security: [{ bearerAuth: [] }],
        },
        body: t.Object({
          Giftistry: t.Object({
            Lists: t.Object({
              Title: t.String(),
              ExpiresAt: t.Optional(t.Nullable(t.String())),
              AllowGroupFunds: t.Optional(t.Boolean()),
              Category: t.Optional(t.String()),
              RevealSuggestions: t.Optional(t.Boolean()),
              AiEnabled: t.Optional(t.Boolean()),
              WebSearchEnabled: t.Optional(t.Boolean()),
              ManualJobBackground: t.Optional(t.Boolean()),
              AutoRollover: t.Optional(t.Boolean()),
            }),
          }),
        }),
      }
    )
    .delete(
      '/wishlists/:listId',
      async ({ params: { listId }, checkListAccess }) => {
        await checkListAccess('owner');
        await useCases.deleteWishlist.execute(listId);
        return { success: true };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Delete a wishlist and its items',
          description:
            'Delete a wishlist, its comments, items, and sharing permissions permanently. Only allowed for the owner.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/wishlists/:listId/rollover',
      async ({ params: { listId }, checkListAccess }) => {
        await checkListAccess('owner');
        const newList = await useCases.rolloverWishlist.execute(listId);
        return { success: true, data: newList };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Rollover a wishlist',
          description:
            'Rollover an expired active wishlist. Deactivates the old one and creates a new active one with unpurchased items.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .post(
      '/wishlists/:listId/duplicate',
      async ({ params: { listId }, getAuthUser, checkListAccess }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const newList = await useCases.duplicateWishlist.execute(listId, user.userId);
        return { success: true, data: newList };
      },
      {
        detail: {
          tags: ['Wishlists'],
          summary: 'Duplicate wishlist onto the current user account',
          description:
            'Creates a new wishlist owned by the caller with a “(copy)” title, cloning visible items. Does not copy shares or claims.',
          security: [{ bearerAuth: [] }],
        },
      }
    );
