import type { FriendRequestRepository } from '../../domain/ports/friend-request.repository';
import { FriendRequestEntity } from '../../domain/friend-request.entity';
import type { FriendRequest } from '../../domain/interfaces/friend-request.interface';
import { AppError } from '@/common/domain/errors/app-error';

export class CancelFriendRequestUseCase {
  constructor(private friendRequestRepo: FriendRequestRepository) {}

  async execute(userId: string, requestId: string): Promise<FriendRequest> {
    const request = await this.friendRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError('Friend request not found', 404, 'NOT_FOUND');
    }

    FriendRequestEntity.from(request).canBeCancelledBy(userId);

    return await this.friendRequestRepo.updateStatus(requestId, 'cancelled');
  }
}
