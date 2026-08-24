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
import type {
  DeletePushSubscriptionUseCase,
  ListPushSubscriptionsUseCase,
  RegisterPushSubscriptionUseCase,
  SetPrimaryPushSubscriptionUseCase,
} from '../application/push-subscription.use-cases';

export interface NotificationsUseCases {
  listNotifications: ListNotificationsUseCase;
  markNotificationRead: MarkNotificationReadUseCase;
  markAllNotificationsRead: MarkAllNotificationsReadUseCase;
  deleteNotification: DeleteNotificationUseCase;
  clearAllNotifications: ClearAllNotificationsUseCase;
  getNotificationPrefs: GetNotificationPrefsUseCase;
  updateNotificationPrefs: UpdateNotificationPrefsUseCase;
  registerPushSubscription: RegisterPushSubscriptionUseCase;
  listPushSubscriptions: ListPushSubscriptionsUseCase;
  deletePushSubscription: DeletePushSubscriptionUseCase;
  setPrimaryPushSubscription: SetPrimaryPushSubscriptionUseCase;
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
  .patch('/notifications/preferences', async ({ getAuthUser, body: { Giftistry: { Notifications } } }) => {
    const user = await getAuthUser();
    const prefs = await useCases.updateNotificationPrefs.execute(user.userId, {
      EmailAlerts: Notifications.EmailAlerts,
      Marketing: Notifications.Marketing,
      FriendRequests: Notifications.FriendRequests,
      ListShares: Notifications.ListShares,
      ItemClaims: Notifications.ItemClaims,
      Comments: Notifications.Comments,
      JobCompletions: Notifications.JobCompletions,
      PushAlerts: Notifications.PushAlerts,
    });
    return { success: true, data: prefs };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Notifications: t.Object({
          EmailAlerts: t.Optional(t.Boolean()),
          Marketing: t.Optional(t.Boolean()),
          FriendRequests: t.Optional(t.Boolean()),
          ListShares: t.Optional(t.Boolean()),
          ItemClaims: t.Optional(t.Boolean()),
          Comments: t.Optional(t.Boolean()),
          JobCompletions: t.Optional(t.Boolean()),
          PushAlerts: t.Optional(t.Boolean()),
        }),
      }),
    }),
    detail: { tags: ['Notifications'], summary: 'Update notification preferences', security: [{ bearerAuth: [] }] }
  })
  .post('/notifications/push/register', async ({ getAuthUser, body: { Giftistry: { Push } } }) => {
    const user = await getAuthUser();
    const data = await useCases.registerPushSubscription.execute(user.userId, Push);
    return { success: true, data };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Push: t.Object({
          Platform: t.Union([t.Literal('ios'), t.Literal('android')]),
          Transport: t.Union([t.Literal('ntfy'), t.Literal('webpush'), t.Literal('fcm')]),
          Endpoint: t.Optional(t.String()),
          Keys: t.Optional(
            t.Object({
              P256dh: t.Optional(t.String()),
              Auth: t.Optional(t.String()),
            })
          ),
          IsPrimary: t.Optional(t.Boolean()),
        }),
      }),
    }),
    detail: { tags: ['Notifications'], summary: 'Register push subscription', security: [{ bearerAuth: [] }] }
  })
  .get('/notifications/push/subscriptions', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    const data = await useCases.listPushSubscriptions.execute(user.userId);
    return { success: true, data };
  }, {
    detail: { tags: ['Notifications'], summary: 'List push subscriptions', security: [{ bearerAuth: [] }] }
  })
  .delete('/notifications/push/register/:id', async ({ getAuthUser, params: { id } }) => {
    const user = await getAuthUser();
    await useCases.deletePushSubscription.execute(user.userId, id);
    return { success: true };
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Notifications'], summary: 'Delete push subscription', security: [{ bearerAuth: [] }] }
  })
  .put('/notifications/push/register/:id/primary', async ({ getAuthUser, params: { id } }) => {
    const user = await getAuthUser();
    const data = await useCases.setPrimaryPushSubscription.execute(user.userId, id);
    return { success: true, data };
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Notifications'], summary: 'Set primary push subscription', security: [{ bearerAuth: [] }] }
  });
