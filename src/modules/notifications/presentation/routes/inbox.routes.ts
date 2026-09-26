import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { NOTIFICATIONS_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { NotificationsRoutesDeps } from '../interfaces/notifications-routes-deps.interface';
import { idParamsSchema } from '../schemas/id-params.schema';

export const inboxRoutes = ({ useCases }: NotificationsRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .get(
      '/notifications',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        const notifications = await useCases.listNotifications.execute(user.userId);
        return { success: true, data: notifications };
      },
      { detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'List notifications' } }
    )
    .patch(
      '/notifications/:id/read',
      async ({ getAuthUser, params: { id } }) => {
        const user = await getAuthUser();
        const notification = await useCases.markNotificationRead.execute(user.userId, id);
        return { success: true, data: notification };
      },
      {
        params: idParamsSchema,
        detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Mark notification read' },
      }
    )
    .post(
      '/notifications/read-all',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        await useCases.markAllNotificationsRead.execute(user.userId);
        return { success: true };
      },
      { detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Mark all notifications read' } }
    )
    .delete(
      '/notifications/:id',
      async ({ getAuthUser, params: { id } }) => {
        const user = await getAuthUser();
        await useCases.deleteNotification.execute(user.userId, id);
        return { success: true };
      },
      {
        params: idParamsSchema,
        detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Delete notification' },
      }
    )
    .delete(
      '/notifications',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        await useCases.clearAllNotifications.execute(user.userId);
        return { success: true };
      },
      { detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Clear all notifications' } }
    );
