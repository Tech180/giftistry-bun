import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { NOTIFICATIONS_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { NotificationsRoutesDeps } from '../interfaces/notifications-routes-deps.interface';
import { idParamsSchema } from '../schemas/id-params.schema';
import { registerPushBodySchema } from '../schemas/register-push-body.schema';

export const pushRoutes = ({ useCases }: NotificationsRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .post(
      '/notifications/push/register',
      async ({ getAuthUser, body: { Giftistry: { Push } } }) => {
        const user = await getAuthUser();
        const data = await useCases.registerPushSubscription.execute(user.userId, Push);
        return { success: true, data };
      },
      {
        body: registerPushBodySchema,
        detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Register push subscription' },
      }
    )
    .get(
      '/notifications/push/subscriptions',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        const data = await useCases.listPushSubscriptions.execute(user.userId);
        return { success: true, data };
      },
      { detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'List push subscriptions' } }
    )
    .delete(
      '/notifications/push/register/:id',
      async ({ getAuthUser, params: { id } }) => {
        const user = await getAuthUser();
        await useCases.deletePushSubscription.execute(user.userId, id);
        return { success: true };
      },
      {
        params: idParamsSchema,
        detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Delete push subscription' },
      }
    )
    .put(
      '/notifications/push/register/:id/primary',
      async ({ getAuthUser, params: { id } }) => {
        const user = await getAuthUser();
        const data = await useCases.setPrimaryPushSubscription.execute(user.userId, id);
        return { success: true, data };
      },
      {
        params: idParamsSchema,
        detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Set primary push subscription' },
      }
    );
