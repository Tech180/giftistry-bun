import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { rateLimit } from '@/common/middlewares/rate-limit.middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemUseCases } from './item-use-cases.interface';

export const itemRoutes = (
  useCases: ItemUseCases,
  middleware: RouteMiddleware
) => new Elysia({ prefix: '/api' })
  .use(middleware.auth)
  .use(middleware.listAccess)
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
  .post('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Items: { name, description, priorityId, isHiddenIdea, linkUrl, price, websiteName, category, priority, sharedWithUserIds } } } }) => {
    const { role } = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const resolvedHidden = isHiddenIdea ?? false;
    if (role === 'owner' && resolvedHidden) {
      throw new AppError('Forbidden: Owner cannot add hidden ideas to their own list', 403, 'FORBIDDEN');
    }

    const isSuggestion = role !== 'owner';
    const isOwner = role === 'owner';

    const validatedAudience = await useCases.validateItemAudience.execute(
      listId,
      sharedWithUserIds,
      user.userId,
      isOwner
    );

    const item = await useCases.addItem.execute(
      listId,
      name,
      description ?? null,
      priorityId ?? null,
      resolvedHidden || isSuggestion,
      user.userId,
      linkUrl ?? null,
      price !== undefined && price !== null ? Number(price) : null,
      websiteName ?? null,
      category ?? 'uncategorized',
      isSuggestion,
      priority !== undefined && priority !== null ? Number(priority) : null,
      validatedAudience
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
          linkUrl: t.Optional(t.Nullable(t.String())),
          price: t.Optional(t.Nullable(t.Numeric())),
          websiteName: t.Optional(t.Nullable(t.String())),
          category: t.Optional(t.Nullable(t.String())),
          isSuggestion: t.Optional(t.Boolean()),
          priority: t.Optional(t.Nullable(t.Numeric())),
          sharedWithUserIds: t.Optional(t.Array(t.String())),
        })
      })
    })
  })
  .get('/items/:itemId/reviews', async ({ checkListAccess, params: { itemId } }) => {
    await checkListAccess('viewer');
    const reviews = await useCases.getItemReviews.execute(itemId);
    if (!reviews) {
      return { success: true, data: null };
    }
    return {
      success: true,
      data: {
        summary: reviews.Summary,
        pros: reviews.Pros,
        cons: reviews.Cons,
        reviews: reviews.Reviews,
      }
    };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Get AI reviews for an item',
      description: 'Fetch the AI-generated pros, cons, summary, and representative reviews for a wishlist item.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/items/:itemId/links', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { url } } } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    const link = await useCases.addItemLink.execute(itemId, url, user.userId);
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
  .post('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { amount, claimedByName, anonymous, quantity, selection } } } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot claim items on their own list', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    const claim = await useCases.claimItem.execute(
      itemId,
      user.userId,
      amount ?? null,
      claimedByName ?? null,
      anonymous ?? false,
      quantity ?? 1,
      selection ?? null
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
          anonymous: t.Optional(t.Boolean()),
          quantity: t.Optional(t.Numeric()),
          selection: t.Optional(t.Nullable(t.String())),
        })
      })
    })
  })
  .delete('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot unclaim items', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    await useCases.unclaimItem.execute(itemId, user.userId);
    return { success: true, message: 'Item unclaimed successfully' };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Unclaim item in wishlist',
      description: 'Remove a claim made by the current user.',
      security: [{ bearerAuth: [] }]
    }
  })
  .use(rateLimit({ windowMs: 60000, max: 10, paths: ['/items/extract-metadata'] }))
  .post('/items/extract-metadata', async ({ body: { Giftistry: { Items: { url } } } }) => {
    try {
      const data = await useCases.extractMetadata.execute(url);
      return {
        success: true,
        data: {
          title: data.title,
          price: data.price,
          description: data.description,
          color: data.color,
          size: data.size,
          category: data.category,
        },
      };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Error extracting metadata' };
    }
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Extract metadata from link',
      description: 'Scrapes webpage metadata like title and price from a URL to autopopulate the item creation form.',
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
  .put('/items/:itemId', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { name, description, priorityId, category, priority, sharedWithUserIds } } } }) => {
    const access = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const isOwner = access.role === 'owner';

    let validatedAudience: string[] | undefined;
    if (sharedWithUserIds !== undefined) {
      validatedAudience = await useCases.validateItemAudience.execute(
        access.listId,
        sharedWithUserIds,
        user.userId,
        isOwner,
        itemId
      );
    }

    const item = await useCases.updateItem.execute(
      itemId,
      user.userId,
      name,
      description ?? null,
      priorityId ?? null,
      category ?? 'uncategorized',
      priority !== undefined && priority !== null ? Number(priority) : null,
      validatedAudience
    );
    return { success: true, data: item };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Update item in wishlist',
      description: 'Update a gift item by ID. Requires owner or collaborator role.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          name: t.String(),
          description: t.Optional(t.Nullable(t.String())),
          priorityId: t.Optional(t.Nullable(t.String())),
          category: t.Optional(t.Nullable(t.String())),
          priority: t.Optional(t.Nullable(t.Numeric())),
          sharedWithUserIds: t.Optional(t.Array(t.String())),
        })
      })
    })
  })
  .get('/items/field-definitions', async ({ query: { category } }) => {
    const definitions = await useCases.getFieldDefinitions.execute(category || '');
    return { success: true, data: definitions };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Get dynamic optional field definitions for a category',
      description: 'Fetch all field definitions and dependencies for a category.',
      security: [{ bearerAuth: [] }]
    },
    query: t.Object({
      category: t.String()
    })
  })
  .delete('/items/:itemId', async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    await useCases.deleteItem.execute(itemId, user.userId);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Delete item from wishlist',
      description: 'Delete a gift item by ID. Requires owner or collaborator role.',
      security: [{ bearerAuth: [] }]
    }
  });
