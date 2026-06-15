import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { listAccessMiddleware } from '@/common/middlewares/list-access.middleware';
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
  .post('/wishlists', async ({ getAuthUser, body: { Giftistry: { Lists: { title, expiresAt, allowGroupFunds } } } }) => {
    const user = await getAuthUser();
    const wishlist = await useCases.createWishlist.execute(
      user.userId,
      title,
      expiresAt,
      allowGroupFunds ?? false
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
  .get('/priorities', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const priorities = await useCases.listPriorities.execute(user.userId);
    return { success: true, data: priorities };
  }, {
    detail: {
      tags: ['Priorities'],
      summary: 'List priority levels',
      description: 'Fetch all priority categories for the authenticated user.',
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
  });
