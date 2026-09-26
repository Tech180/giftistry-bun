import { Elysia, t } from 'elysia';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import type { UseCases } from '../interfaces/use-cases.interface';

export const prioritiesRoutes = (useCases: UseCases, middleware: RouteMiddleware) =>
  new Elysia()
    .use(middleware.auth)
    .post(
      '/priorities',
      async ({
        getAuthUser,
        body: {
          Giftistry: {
            Priorities: { Label, Weight },
          },
        },
      }) => {
        const user = await getAuthUser();
        const priority = await useCases.createPriority.execute(user.userId, Label, Weight);
        return { success: true, data: priority };
      },
      {
        detail: {
          tags: ['Priorities'],
          summary: 'Create a priority level',
          description: 'Create a priority category weight and label for user items.',
          security: [{ bearerAuth: [] }],
        },
        body: t.Object({
          Giftistry: t.Object({
            Priorities: t.Object({
              Label: t.String(),
              Weight: t.Numeric(),
            }),
          }),
        }),
      }
    )
    .get(
      '/priorities',
      async ({ getAuthUser, query }) => {
        const user = await getAuthUser();

        if (query?.wishlistId) {
          await getListAccessContext(user.userId, { listId: query.wishlistId });
        }

        const priorities = await useCases.listPriorities.execute(user.userId, query?.wishlistId);
        return { success: true, data: priorities };
      },
      {
        query: t.Optional(
          t.Object({
            wishlistId: t.Optional(t.String()),
          })
        ),
        detail: {
          tags: ['Priorities'],
          summary: 'List priority levels',
          description:
            'Fetch all priority categories for the authenticated user or for a specific wishlist owner.',
          security: [{ bearerAuth: [] }],
        },
      }
    )
    .delete(
      '/priorities/:id',
      async ({ getAuthUser, params: { id } }) => {
        const user = await getAuthUser();
        await useCases.deletePriority.execute(id, user.userId);
        return { success: true };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
        detail: {
          tags: ['Priorities'],
          summary: 'Delete a priority category',
          description: 'Remove a custom priority level/category created by the authenticated user.',
          security: [{ bearerAuth: [] }],
        },
      }
    );
