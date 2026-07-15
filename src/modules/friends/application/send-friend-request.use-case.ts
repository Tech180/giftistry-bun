import type { FriendRepository } from '../domain/ports/friend.repository';
import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { FriendRequest } from '../domain/friend.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import { FriendRequestSentEvent } from '../domain/events/friend-request-sent.event';

export class SendFriendRequestUseCase {
  constructor(
    private friendRequestRepo: FriendRequestRepository,
    private friendRepo: FriendRepository,
    private userRepo: UserRepository,
    private eventBus: EventBus,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(senderId: string, receiverId: string): Promise<FriendRequest> {
    await this.assertUserCan.execute(senderId, 'CanSendFriendRequests');
    if (senderId === receiverId) {
      throw new AppError('You cannot send a friend request to yourself', 400, 'BAD_REQUEST');
    }

    const alreadyFriends = await this.friendRepo.areFriends(senderId, receiverId);
    if (alreadyFriends) {
      throw new AppError('You are already friends with this user', 400, 'BAD_REQUEST');
    }

    const existing = await this.friendRequestRepo.findPendingBetween(senderId, receiverId);
    if (existing) {
      throw new AppError('A pending friend request already exists', 400, 'BAD_REQUEST');
    }

    const reverse = await this.friendRequestRepo.findPendingBetween(receiverId, senderId);
    if (reverse) {
      throw new AppError('This user already sent you a friend request', 400, 'BAD_REQUEST');
    }

    const isDisabled = await this.userRepo.isUserDisabled(receiverId);
    if (isDisabled === null) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    if (isDisabled) {
      throw new AppError('This user cannot receive friend requests', 400, 'BAD_REQUEST');
    }

    const request = await this.friendRequestRepo.create(senderId, receiverId);

    const sender = await this.userRepo.findById(senderId);
    const senderUsername = sender?.Username || 'Someone';

    void this.eventBus.publish(
      new FriendRequestSentEvent(receiverId, senderId, request.Id, senderUsername)
    ).catch(err => console.error('[Notifications] Failed to publish friend_request event:', err));

    return request;
  }
}
