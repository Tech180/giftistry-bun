import type { PushSubscriptionRepository } from '../../domain/ports/push-subscription.repository';
import type { PushSubscriptionPublic } from '../../domain/interfaces/push-subscription-public.interface';
import { toPushSubscriptionPublic } from '../../domain/utils/to-push-subscription-public.util';

export class ListPushSubscriptionsUseCase {
  constructor(private pushSubscriptionRepo: PushSubscriptionRepository) {}

  async execute(userId: string): Promise<PushSubscriptionPublic[]> {
    const subs = await this.pushSubscriptionRepo.findByUserId(userId);
    return subs.map(toPushSubscriptionPublic);
  }
}
