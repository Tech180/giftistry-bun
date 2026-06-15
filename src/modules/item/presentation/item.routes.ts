import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { listAccessMiddleware } from '@/common/middlewares/list-access.middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemUseCases } from './item-use-cases.interface';

export const itemRoutes = (useCases: ItemUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .use(listAccessMiddleware)
  .get('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const items = await useCases.listItems.execute(listId, user.userId);
    return { success: true, data: items };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Get items in wishlist',
      description: 'Fetch all items in a wishlist. Hides hidden items for owners if the list is not expired.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Items: { name, description, priorityId, isHiddenIdea } } } }) => {
    const { role } = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const resolvedHidden = isHiddenIdea ?? false;
    if (role === 'owner' && resolvedHidden) {
      throw new AppError('Forbidden: Owner cannot add hidden ideas to their own list', 403, 'FORBIDDEN');
    }

    const item = await useCases.addItem.execute(
      listId,
      name,
      description ?? null,
      priorityId ?? null,
      resolvedHidden,
      user.userId
    );
    return { success: true, data: item };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Add item to wishlist',
      description: 'Add a new gift item to a wishlist. Owners cannot add hidden ideas.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          name: t.String(),
          description: t.Optional(t.Nullable(t.String())),
          priorityId: t.Optional(t.Nullable(t.String())),
          isHiddenIdea: t.Optional(t.Boolean()),
        })
      })
    })
  })
  .post('/items/:itemId/links', async ({ checkListAccess, params: { itemId }, body: { Giftistry: { Items: { url } } } }) => {
    await checkListAccess('collaborator');
    const link = await useCases.addItemLink.execute(itemId, url);
    return { success: true, data: link };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Add purchasing link to item',
      description: 'Add a store/purchasing URL to a wishlist item.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          url: t.String(),
        })
      })
    })
  })
  .post('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { amount, claimedByName } } } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot claim items on their own list', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    const claim = await useCases.claimItem.execute(
      itemId,
      user.userId,
      amount ?? null,
      claimedByName ?? null
    );
    return { success: true, data: claim };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Claim item in wishlist',
      description: 'Claim/purchase a wishlist item. Owners cannot claim their own items.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          amount: t.Optional(t.Nullable(t.Numeric())),
          claimedByName: t.Optional(t.Nullable(t.String())),
        })
      })
    })
  });
