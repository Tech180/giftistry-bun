import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemUseCases } from '../application/item-use-cases.interface';

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
  .post('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Items: { Name, Description, PriorityId, IsHiddenIdea, LinkUrl, Price, WebsiteName, Category, Priority, SharedWithUserIds, Metadata } } } }) => {
    const { role } = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const resolvedHidden = IsHiddenIdea ?? false;
    if (role === 'owner' && resolvedHidden) {
      throw new AppError('Forbidden: Owner cannot add hidden ideas to their own list', 403, 'FORBIDDEN');
    }

    const isSuggestion = role !== 'owner';
    const isOwner = role === 'owner';

    const validatedAudience = await useCases.validateItemAudience.execute(
      listId,
      SharedWithUserIds,
      user.userId,
      isOwner
    );

    const item = await useCases.addItem.execute(
      listId,
      Name,
      Description ?? null,
      PriorityId ?? null,
      resolvedHidden || isSuggestion,
      user.userId,
      LinkUrl ?? null,
      Price !== undefined && Price !== null ? Number(Price) : null,
      WebsiteName ?? null,
      Category ?? 'uncategorized',
      isSuggestion,
      Priority !== undefined && Priority !== null ? Number(Priority) : null,
      validatedAudience,
      Metadata ?? null
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
          Name: t.String(),
          Description: t.Optional(t.Nullable(t.String())),
          PriorityId: t.Optional(t.Nullable(t.String())),
          IsHiddenIdea: t.Optional(t.Boolean()),
          LinkUrl: t.Optional(t.Nullable(t.String())),
          Price: t.Optional(t.Nullable(t.Numeric())),
          WebsiteName: t.Optional(t.Nullable(t.String())),
          Category: t.Optional(t.Nullable(t.String())),
          IsSuggestion: t.Optional(t.Boolean()),
          Priority: t.Optional(t.Nullable(t.Numeric())),
          SharedWithUserIds: t.Optional(t.Array(t.String())),
          Metadata: t.Optional(t.Nullable(t.Object({
            Text: t.Optional(t.Nullable(t.String())),
            CustomFields: t.Optional(t.Nullable(t.Object({
              Predefined: t.Optional(t.Nullable(t.Record(t.String(), t.Nullable(t.String())))),
              UserDefined: t.Optional(t.Nullable(t.Record(t.String(), t.String()))),
            }))),
            DesiredQuantity: t.Optional(t.Nullable(t.Numeric())),
            Variations: t.Optional(t.Nullable(t.Array(t.Object({
              Name: t.String(),
              Quantity: t.Numeric(),
            })))),
            LinkedItemIds: t.Optional(t.Nullable(t.Array(t.String()))),
            RelatedItemIds: t.Optional(t.Nullable(t.Array(t.String()))),
            OtherUsersCanSee: t.Optional(t.Nullable(t.Boolean())),
            MultiCount: t.Optional(t.Nullable(t.Boolean())),
            IsFavorite: t.Optional(t.Nullable(t.Boolean())),
            IsPinned: t.Optional(t.Nullable(t.Boolean())),
            Photos: t.Optional(t.Nullable(t.Array(t.Object({
              DataUrl: t.String(),
            }), { maxItems: 10 }))),
          })))
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
  .post('/items/:itemId/links', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { Url } } } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    const link = await useCases.addItemLink.execute(itemId, Url, user.userId);
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
          Url: t.String(),
        })
      })
    })
  })
  .post('/items/:itemId/links/sync', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { TargetItemIds } } } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    await useCases.syncItemLinks.execute(itemId, TargetItemIds, user.userId);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Sync bidirectional links for item',
      description: 'Synchronize the linked items bidirectional graph in a single call.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          TargetItemIds: t.Array(t.String()),
        })
      })
    })
  })
  .post('/items/:itemId/related/sync', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { TargetItemIds } } } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    await useCases.syncItemRelated.execute(itemId, TargetItemIds, user.userId);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Sync bidirectional related items for item',
      description: 'Synchronize the related items bidirectional graph in a single call. Related items do not affect claiming.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          TargetItemIds: t.Array(t.String()),
        })
      })
    })
  })
  .post('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { Amount, ClaimedByName, Anonymous, Quantity, Selection, IncludeLinked } } } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot claim items on their own list', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    if (IncludeLinked) {
      const claims = await useCases.claimItemWithLinked.execute(itemId, user.userId, {
        amount: Amount ?? null,
        claimedByName: ClaimedByName ?? null,
        anonymous: Anonymous ?? false,
        quantity: Quantity ?? 1,
        selection: Selection ?? null,
        includeLinked: true,
      });
      const itemIds = [...new Set(claims.map((c) => c.ItemId))];
      const items = await useCases.buildItemClaimProjections.execute(itemIds, user.userId);
      return { success: true, data: { Claims: claims, Items: items } };
    }
    const claim = await useCases.claimItem.execute(
      itemId,
      user.userId,
      Amount ?? null,
      ClaimedByName ?? null,
      Anonymous ?? false,
      Quantity ?? 1,
      Selection ?? null
    );
    const items = await useCases.buildItemClaimProjections.execute([itemId], user.userId);
    return { success: true, data: { Claims: claim, Items: items } };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Claim item in wishlist',
      description: 'Claim/purchase a wishlist item. Owners cannot claim their own items. Set IncludeLinked to also claim unclaimed linked items.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          Amount: t.Optional(t.Nullable(t.Numeric())),
          ClaimedByName: t.Optional(t.Nullable(t.String())),
          Anonymous: t.Optional(t.Boolean()),
          Quantity: t.Optional(t.Numeric()),
          Selection: t.Optional(t.Nullable(t.String())),
          IncludeLinked: t.Optional(t.Boolean()),
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
    const items = await useCases.buildItemClaimProjections.execute([itemId], user.userId);
    return {
      success: true,
      data: {
        Message: 'Item unclaimed successfully',
        Items: items,
      },
    };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Unclaim item in wishlist',
      description: 'Remove a claim made by the current user.',
      security: [{ bearerAuth: [] }]
    }
  })
  .put('/items/:itemId', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { Name, Description, PriorityId, Category, Priority, SharedWithUserIds, LinkUrl, Price, WebsiteName, Metadata } } } }) => {
    const access = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const isOwner = access.role === 'owner';

    let validatedAudience: string[] | undefined;
    if (SharedWithUserIds !== undefined) {
      validatedAudience = await useCases.validateItemAudience.execute(
        access.listId,
        SharedWithUserIds,
        user.userId,
        isOwner,
        itemId
      );
    }

    const item = await useCases.updateItem.execute(
      itemId,
      user.userId,
      Name,
      Description ?? null,
      PriorityId ?? null,
      Category ?? 'uncategorized',
      Priority !== undefined && Priority !== null ? Number(Priority) : null,
      validatedAudience,
      LinkUrl,
      Price !== undefined ? (Price !== null ? Number(Price) : null) : undefined,
      WebsiteName,
      Metadata ?? undefined
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
          Name: t.String(),
          Description: t.Optional(t.Nullable(t.String())),
          PriorityId: t.Optional(t.Nullable(t.String())),
          Category: t.Optional(t.Nullable(t.String())),
          Priority: t.Optional(t.Nullable(t.Numeric())),
          SharedWithUserIds: t.Optional(t.Array(t.String())),
          LinkUrl: t.Optional(t.Nullable(t.String())),
          Price: t.Optional(t.Nullable(t.Numeric())),
          WebsiteName: t.Optional(t.Nullable(t.String())),
          Metadata: t.Optional(t.Nullable(t.Object({
            Text: t.Optional(t.Nullable(t.String())),
            CustomFields: t.Optional(t.Nullable(t.Object({
              Predefined: t.Optional(t.Nullable(t.Record(t.String(), t.Nullable(t.String())))),
              UserDefined: t.Optional(t.Nullable(t.Record(t.String(), t.String()))),
            }))),
            DesiredQuantity: t.Optional(t.Nullable(t.Numeric())),
            Variations: t.Optional(t.Nullable(t.Array(t.Object({
              Name: t.String(),
              Quantity: t.Numeric(),
            })))),
            LinkedItemIds: t.Optional(t.Nullable(t.Array(t.String()))),
            RelatedItemIds: t.Optional(t.Nullable(t.Array(t.String()))),
            OtherUsersCanSee: t.Optional(t.Nullable(t.Boolean())),
            MultiCount: t.Optional(t.Nullable(t.Boolean())),
            IsFavorite: t.Optional(t.Nullable(t.Boolean())),
            IsPinned: t.Optional(t.Nullable(t.Boolean())),
            Photos: t.Optional(t.Nullable(t.Array(t.Object({
              DataUrl: t.String(),
            }), { maxItems: 10 }))),
          })))
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
