import { AppError } from '@/common/domain/errors/app-error';
import type { PushSubscriptionRepository } from '../../domain/ports/push-subscription.repository';
import type { PushSubscriptionPublic } from '../../domain/interfaces/push-subscription-public.interface';
import { toPushSubscriptionPublic } from '../../domain/utils/to-push-subscription-public.util';

export class SetPrimaryPushSubscriptionUseCase {
  constructor(private pushSubscriptionRepo: PushSubscriptionRepository) {}

  async execute(userId: string, subscriptionId: string): Promise<PushSubscriptionPublic> {
    const existing = await this.pushSubscriptionRepo.findById(subscriptionId, userId);
    if (!existing) {
      throw new AppError('Push subscription not found', 404, 'NOT_FOUND');
    }
    const updated = await this.pushSubscriptionRepo.setPrimary(subscriptionId, userId);
    return toPushSubscriptionPublic(updated);
  }
}
