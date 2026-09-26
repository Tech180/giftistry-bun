import type { PushPayload } from '../interfaces/push-payload.interface';
import type { PushSubscription } from '../interfaces/push-subscription.interface';

export interface PushNotificationPort {
  send(subscription: PushSubscription, payload: PushPayload): Promise<void>;
}
