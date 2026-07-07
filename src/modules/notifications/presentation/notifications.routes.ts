import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import type {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  DeleteNotificationUseCase,
  ClearAllNotificationsUseCase,
  GetNotificationPrefsUseCase,
  UpdateNotificationPrefsUseCase,
} from '../application/notification.use-cases';

export interface NotificationsUseCases {
  listNotifications: ListNotificationsUseCase;
  markNotificationRead: MarkNotificationReadUseCase;
  markAllNotificationsRead: MarkAllNotificationsReadUseCase;
  deleteNotification: DeleteNotificationUseCase;
  clearAllNotifications: ClearAllNotificationsUseCase;
  getNotificationPrefs: GetNotificationPrefsUseCase;
  updateNotificationPrefs: UpdateNotificationPrefsUseCase;
}

export const notificationsRoutes = (useCases: NotificationsUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .get('/notifications', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const notifications = await useCases.listNotifications.execute(user.userId);
    return { success: true, data: notifications };
  }, {
    detail: { tags: ['Notifications'], summary: 'List notifications', security: [{ bearerAuth: [] }] }
  })
  .patch('/notifications/:id/read', async ({ getAuthUser, params: { id } }) => {
    const user = await getAuthUser();
    const notification = await useCases.markNotificationRead.execute(user.userId, id);
    return { success: true, data: notification };
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Notifications'], summary: 'Mark notification read', security: [{ bearerAuth: [] }] }
  })
  .post('/notifications/read-all', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    await useCases.markAllNotificationsRead.execute(user.userId);
    return { success: true };
  }, {
    detail: { tags: ['Notifications'], summary: 'Mark all notifications read', security: [{ bearerAuth: [] }] }
  })
  .delete('/notifications/:id', async ({ getAuthUser, params: { id } }) => {
    const user = await getAuthUser();
    await useCases.deleteNotification.execute(user.userId, id);
    return { success: true };
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Notifications'], summary: 'Delete notification', security: [{ bearerAuth: [] }] }
  })
  .delete('/notifications', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    await useCases.clearAllNotifications.execute(user.userId);
    return { success: true };
  }, {
    detail: { tags: ['Notifications'], summary: 'Clear all notifications', security: [{ bearerAuth: [] }] }
  })
  .get('/notifications/preferences', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const prefs = await useCases.getNotificationPrefs.execute(user.userId);
    return { success: true, data: prefs };
  }, {
    detail: { tags: ['Notifications'], summary: 'Get notification preferences', security: [{ bearerAuth: [] }] }
  })
  .patch('/notifications/preferences', async ({ getAuthUser, body }) => {
    const user = await getAuthUser();
    const prefs = await useCases.updateNotificationPrefs.execute(user.userId, {
      EmailAlerts: body.emailAlerts,
      Marketing: body.marketing,
      FriendRequests: body.friendRequests,
      ListShares: body.listShares,
      ItemClaims: body.itemClaims,
      Comments: body.comments,
    });
    return { success: true, data: prefs };
  }, {
    body: t.Object({
      emailAlerts: t.Optional(t.Boolean()),
      marketing: t.Optional(t.Boolean()),
      friendRequests: t.Optional(t.Boolean()),
      listShares: t.Optional(t.Boolean()),
      itemClaims: t.Optional(t.Boolean()),
      comments: t.Optional(t.Boolean()),
    }),
    detail: { tags: ['Notifications'], summary: 'Update notification preferences', security: [{ bearerAuth: [] }] }
  });
