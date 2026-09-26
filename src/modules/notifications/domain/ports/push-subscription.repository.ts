import type { CreatePushSubscriptionInput } from '../interfaces/create-push-subscription-input.interface';
import type { PushSubscription } from '../interfaces/push-subscription.interface';

export interface PushSubscriptionRepository {
  create(input: CreatePushSubscriptionInput): Promise<PushSubscription>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
  findById(id: string, userId: string): Promise<PushSubscription | null>;
  deleteById(id: string, userId: string): Promise<void>;
  setPrimary(id: string, userId: string): Promise<PushSubscription>;
  touchLastSeen(id: string, userId: string): Promise<void>;
}
