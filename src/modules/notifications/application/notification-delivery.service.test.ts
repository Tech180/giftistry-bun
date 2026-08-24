import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { NotificationDeliveryService } from './notification-delivery.service';
import type { Notification, NotificationPrefs } from '../domain/notification.entity';
import type { PushSubscription } from '../domain/push-subscription.entity';
import type { PushSubscriptionRepository } from '../domain/ports/push-subscription.repository';
import type { PushNotificationPort } from '../domain/ports/push-notification.port';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { ServerConfig } from '@/modules/system/domain/server-config.entity';

function prefs(overrides: Partial<NotificationPrefs> = {}): NotificationPrefs {
  return {
    UserId: 'u1',
    EmailAlerts: true,
    Marketing: false,
    FriendRequests: true,
    ListShares: true,
    ItemClaims: true,
    Comments: true,
    JobCompletions: true,
    PushAlerts: true,
    UpdatedAt: new Date(),
    ...overrides,
  };
}

function notification(): Notification {
  return {
    Id: 'n1',
    UserId: 'u1',
    Type: 'friend_request',
    Title: 'Hi',
    Message: 'There',
    Metadata: {},
    ReadAt: null,
    CreatedAt: new Date(),
  };
}

function sub(): PushSubscription {
  return {
    Id: 's1',
    UserId: 'u1',
    Platform: 'android',
    Transport: 'ntfy',
    Endpoint: 'giftistry-u1',
    EndpointAuth: null,
    P256dh: null,
    IsPrimary: true,
    CreatedAt: new Date(),
    LastSeenAt: null,
  };
}

describe('NotificationDeliveryService', () => {
  let send: ReturnType<typeof mock>;
  let findByUserId: ReturnType<typeof mock>;
  let service: NotificationDeliveryService;
  let foreground = false;

  beforeEach(() => {
    foreground = false;
    send = mock(() => Promise.resolve());
    findByUserId = mock(() => Promise.resolve([sub()]));
    const pushRepo = { findByUserId } as unknown as PushSubscriptionRepository;
    const ntfy = { send } as unknown as PushNotificationPort;
    const configRepo = {
      load: () =>
        ({
          NtfyEnabled: true,
          WebPushEnabled: false,
          FcmEnabled: false,
          PublicAppUrl: 'https://app.example',
        }) as ServerConfig,
    } as ServerConfigRepository;
    service = new NotificationDeliveryService(
      pushRepo,
      { ntfy },
      configRepo,
      { isUserForegroundConnected: () => foreground }
    );
  });

  test('sends push when background and PushAlerts on', async () => {
    await service.deliverPush('u1', notification(), prefs());
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('skips push when PushAlerts off', async () => {
    await service.deliverPush('u1', notification(), prefs({ PushAlerts: false }));
    expect(send).not.toHaveBeenCalled();
  });

  test('skips push when user is foreground connected', async () => {
    foreground = true;
    await service.deliverPush('u1', notification(), prefs());
    expect(send).not.toHaveBeenCalled();
  });
});
