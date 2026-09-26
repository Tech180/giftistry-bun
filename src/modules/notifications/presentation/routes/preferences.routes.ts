import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { NOTIFICATIONS_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { NotificationsRoutesDeps } from '../interfaces/notifications-routes-deps.interface';
import { updateNotificationPrefsBodySchema } from '../schemas/update-notification-prefs-body.schema';
import { mapNotificationPrefsPayload } from '../utils/map-notification-prefs-payload.util';

export const preferencesRoutes = ({ useCases }: NotificationsRoutesDeps) =>
  new Elysia()
    .use(authMiddleware)
    .get(
      '/notifications/preferences',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        const prefs = await useCases.getNotificationPrefs.execute(user.userId);
        return { success: true, data: prefs };
      },
      { detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Get notification preferences' } }
    )
    .patch(
      '/notifications/preferences',
      async ({ getAuthUser, body: { Giftistry: { Notifications } } }) => {
        const user = await getAuthUser();
        const prefs = await useCases.updateNotificationPrefs.execute(
          user.userId,
          mapNotificationPrefsPayload(Notifications)
        );
        return { success: true, data: prefs };
      },
      {
        body: updateNotificationPrefsBodySchema,
        detail: { ...NOTIFICATIONS_SWAGGER_DETAIL, summary: 'Update notification preferences' },
      }
    );
