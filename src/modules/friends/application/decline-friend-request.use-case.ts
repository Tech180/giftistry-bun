import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';
import type { FriendRequest } from '../domain/friend.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class DeclineFriendRequestUseCase {
  constructor(private friendRequestRepo: FriendRequestRepository) {}

  async execute(userId: string, requestId: string): Promise<FriendRequest> {
    const request = await this.friendRequestRepo.findById(requestId);
    if (!request || request.ReceiverId !== userId) {
      throw new AppError('Friend request not found', 404, 'NOT_FOUND');
    }
    if (request.Status !== 'pending') {
      throw new AppError('Friend request is no longer pending', 400, 'BAD_REQUEST');
    }

    return await this.friendRequestRepo.updateStatus(requestId, 'declined');
  }
}
