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
  })
  .post('/wishlists', async ({ getAuthUser, body: { Giftistry } }) => {
    const user = await getAuthUser();
    const wishlist = await useCases.createWishlist.execute(
      user.userId,
      Giftistry.title,
      Giftistry.expiresAt,
      Giftistry.allowGroupFunds ?? false
    );
    return { success: true, data: wishlist };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        title: t.String(),
        expiresAt: t.Optional(t.Nullable(t.String())),
        allowGroupFunds: t.Optional(t.Boolean()),
      })
    })
  })
  .get('/wishlists', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const wishlists = await useCases.listWishlists.execute(user.userId);
    return { success: true, data: wishlists };
  })
  .post('/priorities', async ({ getAuthUser, body: { Giftistry } }) => {
    const user = await getAuthUser();
    const priority = await useCases.createPriority.execute(user.userId, Giftistry.label, Giftistry.weight);
    return { success: true, data: priority };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        label: t.String(),
        weight: t.Numeric(),
      })
    })
  })
  .get('/priorities', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const priorities = await useCases.listPriorities.execute(user.userId);
    return { success: true, data: priorities };
  })
  .use(listAccessMiddleware)
  .post('/wishlists/:listId/shares', async ({ params: { listId }, checkListAccess, body: { Giftistry } }) => {
    await checkListAccess('owner');
    const share = await useCases.shareWishlist.execute(listId, Giftistry.email, Giftistry.role);
    return { success: true, data: share };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        email: t.String({ format: 'email' }),
        role: t.Union([t.Literal('viewer'), t.Literal('collaborator')]),
      })
    })
  })
  .get('/wishlists/:listId', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('viewer');
    const wishlist = await useCases.getWishlist.execute(listId);
    return { success: true, data: wishlist };
  })
  .put('/wishlists/:listId/deactivate', async ({ params: { listId }, checkListAccess }) => {
    await checkListAccess('owner');
    await useCases.deactivateWishlist.execute(listId);
    return { success: true };
  });
