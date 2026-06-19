import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { listAccessMiddleware, getListAccessContext } from '@/common/middlewares/list-access.middleware';
import type { WishlistUseCases } from './wishlist-use-cases.interface';

export const wishlistRoutes = (useCases: WishlistUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  // Get all expired active lists (useful for n8n cron job)
  .get('/wishlists/expired', async () => {
    const expired = await useCases.listExpiredWishlists.execute();
    return { success: true, data: expired };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Get expired wishlists',
      description: 'Fetch all active wishlists that have expired. Useful for cron jobs.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists', async ({ getAuthUser, body: { Giftistry: { Lists: { title, expiresAt, allowGroupFunds, category } } } }) => {
    const user = await getAuthUser();
    const wishlist = await useCases.createWishlist.execute(
      user.userId,
      title,
      expiresAt,
      allowGroupFunds ?? false,
      category
    );
    return { success: true, data: wishlist };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Create a new wishlist',
      description: 'Creates a new registry list for the authenticated user.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          title: t.String(),
          expiresAt: t.Optional(t.Nullable(t.String())),
          allowGroupFunds: t.Optional(t.Boolean()),
          category: t.Optional(t.String()),
        })
      })
    })
  })
  .get('/wishlists', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const wishlists = await useCases.listWishlists.execute(user.userId);
    return { success: true, data: wishlists };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'List user wishlists',
      description: 'Fetch all wishlists owned by the authenticated user.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/priorities', async ({ getAuthUser, body: { Giftistry: { Priorities: { label, weight } } } }) => {
    const user = await getAuthUser();
    const priority = await useCases.createPriority.execute(user.userId, label, weight);
    return { success: true, data: priority };
  }, {
    detail: {
      tags: ['Priorities'],
      summary: 'Create a priority level',
      description: 'Create a priority category weight and label for user items.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Priorities: t.Object({
          label: t.String(),
          weight: t.Numeric(),
        })
      })
    })
  })
  .get('/priorities', async ({ getAuthUser, query }) => {
    const user = await getAuthUser();
    let targetUserId = user.userId;

    if (query?.wishlistId) {
      await getListAccessContext(user.userId, { listId: query.wishlistId });
      const wishlist = await useCases.getWishlist.execute(query.wishlistId);
      targetUserId = wishlist.UserId;
    }

    const priorities = await useCases.listPriorities.execute(targetUserId);
    return { success: true, data: priorities };
  }, {
    query: t.Optional(t.Object({
      wishlistId: t.Optional(t.String())
    })),
    detail: {
      tags: ['Priorities'],
      summary: 'List priority levels',
      description: 'Fetch all priority categories for the authenticated user or for a specific wishlist owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .delete('/priorities/:id', async ({ getAuthUser, params: { id } }) => {
    const user = await getAuthUser();
    await useCases.deletePriority.execute(id, user.userId);
    return { success: true };
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Priorities'],
      summary: 'Delete a priority category',
      description: 'Remove a custom priority level/category created by the authenticated user.',
      security: [{ bearerAuth: [] }]
    }
  })
  .use(listAccessMiddleware)
  .post('/wishlists/:listId/shares', async ({ params: { listId }, checkListAccess, body: { Giftistry: { Lists: { email, role } } } }) => {
    await checkListAccess('owner');
    const share = await useCases.shareWishlist.execute(listId, email, role);
    return { success: true, data: share };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Share a wishlist',
      description: 'Grant a collaborator or viewer role access to a wishlist.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          email: t.String({ format: 'email' }),
          role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
        })
      })
    })
  })
  .get('/wishlists/:listId', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('viewer');
    const wishlist = await useCases.getWishlist.execute(listId);
    return { success: true, data: wishlist };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Get wishlist by ID',
      description: 'Retrieve a specific wishlist and its items. Requires appropriate access role.',
      security: [{ bearerAuth: [] }]
    }
  })
  .put('/wishlists/:listId/deactivate', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.deactivateWishlist.execute(listId);
    return { success: true };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Deactivate a wishlist',
      description: 'Deactivate and archive a wishlist by ID. Only allowed for the owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .put('/wishlists/:listId', async ({ params: { listId }, checkListAccess, body: { Giftistry: { Lists: { title, expiresAt, allowGroupFunds, category } } } }) => {
    await checkListAccess('owner');
    const updated = await useCases.updateWishlist.execute(listId, title, expiresAt, allowGroupFunds ?? false, category);
    return { success: true, data: updated };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Update/Rename a wishlist',
      description: 'Update the title, expiration, and group funds settings of a wishlist. Only allowed for the owner.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Lists: t.Object({
          title: t.String(),
          expiresAt: t.Optional(t.Nullable(t.String())),
          allowGroupFunds: t.Optional(t.Boolean()),
          category: t.Optional(t.String()),
        })
      })
    })
  })
  .delete('/wishlists/:listId', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.deleteWishlist.execute(listId);
    return { success: true };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Delete a wishlist and its items',
      description: 'Delete a wishlist, its comments, items, and sharing permissions permanently. Only allowed for the owner.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/rollover', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    const newList = await useCases.rolloverWishlist.execute(listId);
    return { success: true, data: newList };
  }, {
    detail: {
      tags: ['Wishlists'],
      summary: 'Rollover a wishlist',
      description: 'Rollover an expired active wishlist. Deactivates the old one and creates a new active one with unpurchased items.',
      security: [{ bearerAuth: [] }]
    }
  });
