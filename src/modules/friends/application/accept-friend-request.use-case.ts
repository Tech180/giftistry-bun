import type { FriendRepository } from '../domain/ports/friend.repository';
import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';
import type { Friend } from '../domain/friend.entity';
import { FriendRequestEntity } from '../domain/friend.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import { FriendRequestAcceptedEvent } from '../domain/events/friend-request-accepted.event';

export class AcceptFriendRequestUseCase {
  constructor(
    private friendRequestRepo: FriendRequestRepository,
    private friendRepo: FriendRepository,
    private eventBus: EventBus
  ) {}

  async execute(userId: string, requestId: string): Promise<Friend> {
    const request = await this.friendRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError('Friend request not found', 404, 'NOT_FOUND');
    }

    FriendRequestEntity.from(request).canBeAcceptedBy(userId);

    await this.friendRequestRepo.updateStatus(requestId, 'accepted');
    const friendship = await this.friendRepo.addFriend(request.SenderId, request.ReceiverId);

    void this.eventBus.publish(
      new FriendRequestAcceptedEvent(request.SenderId, userId, requestId)
    ).catch(err => console.error('[Notifications] Failed to publish friend_accepted event:', err));

    return friendship;
  }
}
