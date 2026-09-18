import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemUseCases } from '../application/item-use-cases.interface';

const substitutionMetadataSchema = t.Optional(
  t.Nullable(
    t.Object({
      Text: t.Optional(t.Nullable(t.String())),
      CustomFields: t.Optional(
        t.Nullable(
          t.Object({
            Predefined: t.Optional(t.Nullable(t.Record(t.String(), t.Nullable(t.String())))),
            UserDefined: t.Optional(t.Nullable(t.Record(t.String(), t.String()))),
          })
        )
      ),
      DesiredQuantity: t.Optional(t.Nullable(t.Numeric())),
      Variations: t.Optional(
        t.Nullable(
          t.Array(
            t.Object({
              Name: t.String(),
              Quantity: t.Numeric(),
            })
          )
        )
      ),
      MultiCount: t.Optional(t.Nullable(t.Boolean())),
      IsFavorite: t.Optional(t.Nullable(t.Boolean())),
      IsPinned: t.Optional(t.Nullable(t.Boolean())),
      Photos: t.Optional(
        t.Nullable(
          t.Array(
            t.Object({
              DataUrl: t.String(),
            }),
            { maxItems: 10 }
          )
        )
      ),
    })
  )
);

const substitutionProductBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Name: t.String({ minLength: 1 }),
      Description: t.Optional(t.Nullable(t.String())),
      LinkUrl: t.Optional(t.Nullable(t.String())),
      Price: t.Optional(t.Nullable(t.Numeric())),
      WebsiteName: t.Optional(t.Nullable(t.String())),
      Category: t.Optional(t.Nullable(t.String())),
      PriorityId: t.Optional(t.Nullable(t.String())),
      Priority: t.Optional(t.Nullable(t.Numeric())),
      IsHiddenIdea: t.Optional(t.Nullable(t.Boolean())),
      Metadata: substitutionMetadataSchema,
    }),
  }),
});

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
      description: 'Fetch all items in a wishlist. Hidden suggestions are omitted for the owner unless the suggester opted in.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Items: { Name, Description, PriorityId, IsHiddenIdea, LinkUrl, Price, WebsiteName, Category, Priority, SharedWithUserIds, Metadata } } } }) => {
    const { role } = await checkListAccess('viewer');
    const user = await getAuthUser();
    const isSuggestion = role === 'viewer';
    const canManageItems = role === 'owner' || role === 'collaborator';
    const isHiddenIdea = isSuggestion ? IsHiddenIdea !== false : false;
    if (canManageItems && (IsHiddenIdea ?? false)) {
      throw new AppError('Forbidden: List editors cannot add hidden ideas to this list', 403, 'FORBIDDEN');
    }

    const validatedAudience = await useCases.validateItemAudience.execute(
      listId,
      SharedWithUserIds,
      user.userId,
      canManageItems
    );

    const item = await useCases.addItem.execute(
      listId,
      Name,
      Description ?? null,
      PriorityId ?? null,
      isHiddenIdea,
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
            AllowSubstitutions: t.Optional(t.Nullable(t.Boolean())),
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
    if (role === 'owner' || role === 'collaborator') {
      throw new AppError('Forbidden: List editors cannot claim items on this list', 403, 'FORBIDDEN');
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
  .delete('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId }, body }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner' || role === 'collaborator') {
      throw new AppError('Forbidden: List editors cannot unclaim items', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    const includeLinked = body?.Giftistry?.Items?.IncludeLinked === true;
    const affectedIds = await useCases.unclaimItemWithLinked.execute(
      itemId,
      user.userId,
      includeLinked
    );
    const items = await useCases.buildItemClaimProjections.execute(affectedIds, user.userId);
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
      description:
        'Remove a claim made by the current user. Set IncludeLinked to also unclaim the current user’s claims on every other item in the same link group.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Optional(
      t.Object({
        Giftistry: t.Object({
          Items: t.Object({
            IncludeLinked: t.Optional(t.Boolean()),
          }),
        }),
      })
    ),
  })
  .put('/items/:itemId', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { Name, Description, PriorityId, Category, Priority, SharedWithUserIds, LinkUrl, Price, WebsiteName, Metadata, IsHiddenIdea } } } }) => {
    const access = await checkListAccess('viewer');
    const user = await getAuthUser();
    const canManageItems = access.role === 'owner' || access.role === 'collaborator';

    let validatedAudience: string[] | undefined;
    if (SharedWithUserIds !== undefined) {
      validatedAudience = await useCases.validateItemAudience.execute(
        access.listId,
        SharedWithUserIds,
        user.userId,
        canManageItems,
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
      Metadata ?? undefined,
      IsHiddenIdea
    );
    return { success: true, data: item };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Update item in wishlist',
      description: 'Update a gift item by ID. Owners may edit items they can see; others may edit only their own suggestions.',
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
          IsHiddenIdea: t.Optional(t.Boolean()),
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
            AllowSubstitutions: t.Optional(t.Nullable(t.Boolean())),
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
  .get('/items/:itemId/substitutions', async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const data = await useCases.listItemSubstitutions.execute(itemId, user.userId);
    return { success: true, data };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'List substitutions for an item',
      security: [{ bearerAuth: [] }],
    },
  })
  .post('/items/:itemId/substitutions/owner', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: payload } } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    const option = await useCases.createOwnerSubstitution.execute(itemId, user.userId, payload);
    return { success: true, data: option };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Create an owner-approved substitution',
      security: [{ bearerAuth: [] }],
    },
    body: substitutionProductBodySchema,
  })
  .post('/items/:itemId/substitutions/custom', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: payload } } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const option = await useCases.createClaimerSubstitution.execute(itemId, user.userId, payload);
    return { success: true, data: option };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Create a claimer custom substitution',
      security: [{ bearerAuth: [] }],
    },
    body: substitutionProductBodySchema,
  })
  .patch('/items/:itemId/substitutions/reorder', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { OrderedIds } } } }) => {
    await checkListAccess('collaborator');
    const user = await getAuthUser();
    await useCases.reorderOwnerSubstitutions.execute(itemId, user.userId, OrderedIds);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Reorder owner-approved substitutions',
      security: [{ bearerAuth: [] }],
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          OrderedIds: t.Array(t.String()),
        }),
      }),
    }),
  })
  .put('/items/:itemId/substitution', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: payload } } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const option = await useCases.updateItemSubstitution.execute(
      itemId,
      user.userId,
      payload
    );
    return { success: true, data: option };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Update a substitution',
      description: 'itemId is the substitution join-row id (item_substitutions.id).',
      security: [{ bearerAuth: [] }],
    },
    body: substitutionProductBodySchema,
  })
  .delete('/items/:itemId/substitution', async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    await useCases.deleteItemSubstitution.execute(itemId, user.userId);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Delete a substitution',
      description: 'itemId is the substitution join-row id (item_substitutions.id).',
      security: [{ bearerAuth: [] }],
    },
  })
  .delete('/items/:itemId', async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    await useCases.deleteItem.execute(itemId, user.userId);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Delete item from wishlist',
      description: 'Delete a gift item by ID. Owners may delete items they can see; others may delete only their own suggestions.',
      security: [{ bearerAuth: [] }]
    }
  });
