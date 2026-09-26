import { Elysia } from 'elysia';
import { ITEM_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { ItemRoutesDeps } from '../interfaces/item-routes-deps.interface';

export const reviewsRoutes = ({ useCases, middleware }: ItemRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .use(middleware.listAccess)
    .get(
      '/items/:itemId/reviews',
      async ({ checkListAccess, params: { itemId } }) => {
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
          },
        };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Get AI reviews for an item',
          description:
            'Fetch the AI-generated pros, cons, summary, and representative reviews for a wishlist item.',
        },
      }
    );
