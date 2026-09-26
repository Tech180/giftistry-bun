import type { PushTransport } from '../../domain/types/push-transport.type';
import type { PushNotificationPort } from '../../domain/ports/push-notification.port';

export type PushNotificationAdapters = Partial<Record<PushTransport, PushNotificationPort>>;
