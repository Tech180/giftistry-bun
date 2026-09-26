import { AppError } from '@/common/domain/errors/app-error';
import type { PushSubscriptionRepository } from '../../domain/ports/push-subscription.repository';

export class DeletePushSubscriptionUseCase {
  constructor(private pushSubscriptionRepo: PushSubscriptionRepository) {}

  async execute(userId: string, subscriptionId: string): Promise<void> {
    const existing = await this.pushSubscriptionRepo.findById(subscriptionId, userId);
    if (!existing) {
      throw new AppError('Push subscription not found', 404, 'NOT_FOUND');
    }
    await this.pushSubscriptionRepo.deleteById(subscriptionId, userId);
  }
}
