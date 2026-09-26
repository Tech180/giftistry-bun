import { Elysia } from 'elysia';
import { ITEM_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { ItemRoutesDeps } from '../interfaces/item-routes-deps.interface';
import { addItemLinkBodySchema } from '../schemas/add-item-link-body.schema';
import { syncItemTargetsBodySchema } from '../schemas/sync-item-targets-body.schema';

export const linksRoutes = ({ useCases, middleware }: ItemRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .post(
      '/items/:itemId/links',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: {
            Items: { Url },
          },
        },
      }) => {
        await checkListAccess('collaborator');
        const user = await getAuthUser();
        const link = await useCases.addItemLink.execute(itemId, Url, user.userId);
        return { success: true, data: link };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Add purchasing link to item',
          description: 'Add a store/purchasing URL to a wishlist item.',
        },
        body: addItemLinkBodySchema,
      }
    )
    .post(
      '/items/:itemId/links/sync',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: {
            Items: { TargetItemIds },
          },
        },
      }) => {
        await checkListAccess('collaborator');
        const user = await getAuthUser();
        await useCases.syncItemLinks.execute(itemId, TargetItemIds, user.userId);
        return { success: true };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Sync bidirectional links for item',
          description: 'Synchronize the linked items bidirectional graph in a single call.',
        },
        body: syncItemTargetsBodySchema,
      }
    )
    .post(
      '/items/:itemId/related/sync',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: {
            Items: { TargetItemIds },
          },
        },
      }) => {
        await checkListAccess('collaborator');
        const user = await getAuthUser();
        await useCases.syncItemRelated.execute(itemId, TargetItemIds, user.userId);
        return { success: true };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Sync bidirectional related items for item',
          description:
            'Synchronize the related items bidirectional graph in a single call. Related items do not affect claiming.',
        },
        body: syncItemTargetsBodySchema,
      }
    );
