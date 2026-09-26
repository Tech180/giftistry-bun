import { Elysia } from 'elysia';
import { ITEM_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { ItemRoutesDeps } from '../interfaces/item-routes-deps.interface';
import { reorderSubstitutionsBodySchema } from '../schemas/reorder-substitutions-body.schema';
import { substitutionProductBodySchema } from '../schemas/substitution-product-body.schema';
import { mapSubstitutionPayload } from '../utils/map-substitution-payload.util';

export const substitutionsRoutes = ({ useCases, middleware }: ItemRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .get(
      '/items/:itemId/substitutions',
      async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const data = await useCases.listItemSubstitutions.execute(itemId, user.userId);
        return { success: true, data };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'List substitutions for an item',
        },
      }
    )
    .post(
      '/items/:itemId/substitutions/owner',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: { Items: payload },
        },
      }) => {
        await checkListAccess('collaborator');
        const user = await getAuthUser();
        const option = await useCases.createOwnerSubstitution.execute(
          itemId,
          user.userId,
          mapSubstitutionPayload(payload)
        );
        return { success: true, data: option };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Create an owner-approved substitution',
        },
        body: substitutionProductBodySchema,
      }
    )
    .post(
      '/items/:itemId/substitutions/custom',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: { Items: payload },
        },
      }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const option = await useCases.createClaimerSubstitution.execute(
          itemId,
          user.userId,
          mapSubstitutionPayload(payload)
        );
        return { success: true, data: option };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Create a claimer custom substitution',
        },
        body: substitutionProductBodySchema,
      }
    )
    .patch(
      '/items/:itemId/substitutions/reorder',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: {
            Items: { OrderedIds },
          },
        },
      }) => {
        await checkListAccess('collaborator');
        const user = await getAuthUser();
        await useCases.reorderOwnerSubstitutions.execute(itemId, user.userId, OrderedIds);
        return { success: true };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Reorder owner-approved substitutions',
        },
        body: reorderSubstitutionsBodySchema,
      }
    )
    .put(
      '/items/:itemId/substitution',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: { Items: payload },
        },
      }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        const option = await useCases.updateItemSubstitution.execute(
          itemId,
          user.userId,
          mapSubstitutionPayload(payload)
        );
        return { success: true, data: option };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Update a substitution',
          description: 'itemId is the substitution join-row id (item_substitutions.id).',
        },
        body: substitutionProductBodySchema,
      }
    )
    .delete(
      '/items/:itemId/substitution',
      async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
        await checkListAccess('viewer');
        const user = await getAuthUser();
        await useCases.deleteItemSubstitution.execute(itemId, user.userId);
        return { success: true };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Delete a substitution',
          description: 'itemId is the substitution join-row id (item_substitutions.id).',
        },
      }
    );
