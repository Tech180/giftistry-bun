import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import { ITEM_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { ItemRoutesDeps } from '../interfaces/item-routes-deps.interface';
import { addItemBodySchema } from '../schemas/add-item-body.schema';
import { fieldDefinitionsQuerySchema } from '../schemas/field-definitions-query.schema';
import { updateItemBodySchema } from '../schemas/update-item-body.schema';
import { mapItemMetadata } from '../utils/map-item-metadata.util';
import { mapOptionalNumber } from '../utils/map-optional-number.util';

export const catalogRoutes = ({ useCases, middleware }: ItemRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .get(
      '/wishlists/:listId/items',
      async ({ getAuthUser, checkListAccess, params: { listId } }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const items = await useCases.listItems.execute(listId, user.userId);
        return { success: true, data: items };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Get items in wishlist',
          description:
            'Fetch all items in a wishlist. Hidden suggestions are omitted for the owner unless the suggester opted in.',
        },
      }
    )
    .post(
      '/wishlists/:listId/items',
      async ({
        getAuthUser,
        checkListAccess,
        params: { listId },
        body: {
          Giftistry: {
            Items: {
              Name,
              Description,
              PriorityId,
              IsHiddenIdea,
              LinkUrl,
              Price,
              WebsiteName,
              Category,
              Priority,
              SharedWithUserIds,
              Metadata,
            },
          },
        },
      }) => {
        const { role } = await checkListAccess('viewer');
        const user = await getAuthUser();
        const isSuggestion = role === 'viewer';
        const canManageItems = role === 'owner' || role === 'collaborator';
        const isHiddenIdea = isSuggestion ? IsHiddenIdea !== false : false;
        if (canManageItems && (IsHiddenIdea ?? false)) {
          throw new AppError(
            'Forbidden: List editors cannot add hidden ideas to this list',
            403,
            'FORBIDDEN'
          );
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
          mapOptionalNumber(Price) ?? null,
          WebsiteName ?? null,
          Category ?? 'uncategorized',
          isSuggestion,
          mapOptionalNumber(Priority) ?? null,
          validatedAudience,
          mapItemMetadata(Metadata) ?? null
        );
        return { success: true, data: item };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Add item to wishlist',
          description: 'Add a new gift item to a wishlist. Owners cannot add hidden ideas.',
        },
        body: addItemBodySchema,
      }
    )
    .put(
      '/items/:itemId',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: {
            Items: {
              Name,
              Description,
              PriorityId,
              Category,
              Priority,
              SharedWithUserIds,
              LinkUrl,
              Price,
              WebsiteName,
              Metadata,
              IsHiddenIdea,
            },
          },
        },
      }) => {
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
          mapOptionalNumber(Priority) ?? null,
          validatedAudience,
          LinkUrl,
          mapOptionalNumber(Price),
          WebsiteName,
          mapItemMetadata(Metadata),
          IsHiddenIdea
        );
        return { success: true, data: item };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Update item in wishlist',
          description:
            'Update a gift item by ID. Owners may edit items they can see; others may edit only their own suggestions.',
        },
        body: updateItemBodySchema,
      }
    )
    .get(
      '/items/field-definitions',
      async ({ query: { category } }) => {
        const definitions = await useCases.getFieldDefinitions.execute(category || '');
        return { success: true, data: definitions };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Get dynamic optional field definitions for a category',
          description: 'Fetch all field definitions and dependencies for a category.',
        },
        query: fieldDefinitionsQuerySchema,
      }
    )
    .delete(
      '/items/:itemId',
      async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        await useCases.deleteItem.execute(itemId, user.userId);
        return { success: true };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Delete item from wishlist',
          description:
            'Delete a gift item by ID. Owners may delete items they can see; others may delete only their own suggestions.',
        },
      }
    );
