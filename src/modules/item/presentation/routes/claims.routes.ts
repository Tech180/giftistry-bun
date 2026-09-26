import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import { ITEM_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { ItemRoutesDeps } from '../interfaces/item-routes-deps.interface';
import { claimItemBodySchema } from '../schemas/claim-item-body.schema';
import { unclaimItemBodySchema } from '../schemas/unclaim-item-body.schema';

export const claimsRoutes = ({ useCases, middleware }: ItemRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .post(
      '/items/:itemId/claims',
      async ({
        getAuthUser,
        checkListAccess,
        params: { itemId },
        body: {
          Giftistry: {
            Items: { Amount, ClaimedByName, Anonymous, Quantity, Selection, IncludeLinked },
          },
        },
      }) => {
        const { role } = await checkListAccess('viewer');
        if (role === 'owner' || role === 'collaborator') {
          throw new AppError(
            'Forbidden: List editors cannot claim items on this list',
            403,
            'FORBIDDEN'
          );
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
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Claim item in wishlist',
          description:
            'Claim/purchase a wishlist item. Owners cannot claim their own items. Set IncludeLinked to also claim unclaimed linked items.',
        },
        body: claimItemBodySchema,
      }
    )
    .delete(
      '/items/:itemId/claims',
      async ({ getAuthUser, checkListAccess, params: { itemId }, body }) => {
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
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Unclaim item in wishlist',
          description:
            'Remove a claim made by the current user. Set IncludeLinked to also unclaim the current user’s claims on every other item in the same link group.',
        },
        body: unclaimItemBodySchema,
      }
    );
