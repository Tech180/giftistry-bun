import type {
  PushPlatform,
  PushSubscription,
  PushTransport,
} from '../push-subscription.entity';

export interface CreatePushSubscriptionInput {
  userId: string;
  platform: PushPlatform;
  transport: PushTransport;
  endpoint: string;
  endpointAuth?: string | null;
  p256dh?: string | null;
  isPrimary?: boolean;
}

export interface PushSubscriptionRepository {
  create(input: CreatePushSubscriptionInput): Promise<PushSubscription>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
  findById(id: string, userId: string): Promise<PushSubscription | null>;
  deleteById(id: string, userId: string): Promise<void>;
  setPrimary(id: string, userId: string): Promise<PushSubscription>;
  touchLastSeen(id: string, userId: string): Promise<void>;
}
