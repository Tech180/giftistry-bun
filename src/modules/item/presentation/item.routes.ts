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
  })
  .post('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry } }) => {
    const { role } = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const isHiddenIdea = Giftistry.isHiddenIdea ?? false;
    if (role === 'owner' && isHiddenIdea) {
      throw new AppError('Forbidden: Owner cannot add hidden ideas to their own list', 403, 'FORBIDDEN');
    }

    const item = await useCases.addItem.execute(
      listId,
      Giftistry.name,
      Giftistry.description ?? null,
      Giftistry.priorityId ?? null,
      isHiddenIdea,
      user.userId
    );
    return { success: true, data: item };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        name: t.String(),
        description: t.Optional(t.Nullable(t.String())),
        priorityId: t.Optional(t.Nullable(t.String())),
        isHiddenIdea: t.Optional(t.Boolean()),
      })
    })
  })
  .post('/items/:itemId/links', async ({ checkListAccess, params: { itemId }, body: { Giftistry } }) => {
    await checkListAccess('collaborator');
    const link = await useCases.addItemLink.execute(itemId, Giftistry.url);
    return { success: true, data: link };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        url: t.String(),
      })
    })
  })
  .post('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot claim items on their own list', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    const claim = await useCases.claimItem.execute(
      itemId,
      user.userId,
      Giftistry.amount ?? null,
      Giftistry.claimedByName ?? null
    );
    return { success: true, data: claim };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        amount: t.Optional(t.Nullable(t.Numeric())),
        claimedByName: t.Optional(t.Nullable(t.String())),
      })
    })
  });
