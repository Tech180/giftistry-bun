import type { FriendRepository } from '../domain/ports/friend.repository';
import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';
import type { Friend } from '../domain/friend.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { createNotification } from '@/modules/notifications/services/create-notification.service';

export class AcceptFriendRequestUseCase {
  constructor(
    private friendRequestRepo: FriendRequestRepository,
    private friendRepo: FriendRepository
  ) {}

  async execute(userId: string, requestId: string): Promise<Friend> {
    const request = await this.friendRequestRepo.findById(requestId);
    if (!request || request.ReceiverId !== userId) {
      throw new AppError('Friend request not found', 404, 'NOT_FOUND');
    }
    if (request.Status !== 'pending') {
      throw new AppError('Friend request is no longer pending', 400, 'BAD_REQUEST');
    }

    await this.friendRequestRepo.updateStatus(requestId, 'accepted');
    const friendship = await this.friendRepo.addFriend(request.SenderId, request.ReceiverId);

    createNotification(
      request.SenderId,
      'friend_accepted',
      'Friend request accepted',
      'Your friend request was accepted.',
      { requestId, userId }
    ).catch(err => console.error('[Notifications] Failed to create friend_accepted notification:', err));

    return friendship;
  }
}
