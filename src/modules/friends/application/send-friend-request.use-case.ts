import type { FriendRepository } from '../domain/ports/friend.repository';
import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';
import type { FriendRequest } from '../domain/friend.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { createNotification } from '@/modules/notifications/services/create-notification.service';
import { assertUserCan } from '@/common/services/user-policy.service';
import { sql } from '@/common/database/connection';

export class SendFriendRequestUseCase {
  constructor(
    private friendRequestRepo: FriendRequestRepository,
    private friendRepo: FriendRepository
  ) {}

  async execute(senderId: string, receiverId: string): Promise<FriendRequest> {
    await assertUserCan(senderId, 'canSendFriendRequests');
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

    const [receiver] = await sql<{ is_disabled: boolean }[]>`
      SELECT is_disabled FROM users WHERE id = ${receiverId}
    `;
    if (!receiver) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    if (receiver.is_disabled) {
      throw new AppError('This user cannot receive friend requests', 400, 'BAD_REQUEST');
    }

    const request = await this.friendRequestRepo.create(senderId, receiverId);

    // Fetch the sender's username to personalize the notification description
    const [sender] = await sql<{ username: string }[]>`SELECT username FROM users WHERE id = ${senderId}`;
    const senderUsername = sender?.username || 'Someone';

    createNotification(
      receiverId,
      'friend_request',
      'New friend request',
      `${senderUsername} has sent you a friend request.`,
      { requestId: request.Id, senderId }
    ).catch(err => console.error('[Notifications] Failed to create friend_request notification:', err));

    return request;
  }
}
