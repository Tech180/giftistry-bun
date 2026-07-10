import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { FriendRepository } from '@/modules/friends/domain/ports/friend.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListShare, ShareRole } from '../domain/list-share.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import { WishlistSharedEvent } from '../domain/events/wishlist-shared.event';

export class BulkShareWishlistUseCase {
  constructor(
    private listShareRepo: ListShareRepository,
    private friendRepo: FriendRepository,
    private userRepo: UserRepository,
    private eventBus: EventBus
  ) {}

  async execute(
    listId: string,
    ownerId: string,
    friendIds: string[],
    role: ShareRole
  ): Promise<ListShare[]> {
    if (!friendIds.length) {
      throw new AppError('At least one friend ID is required', 400, 'BAD_REQUEST');
    }
    if (role !== 'viewer' && role !== 'collaborator') {
      throw new AppError('Invalid role. Role must be either viewer or collaborator', 400, 'BAD_REQUEST');
    }

    const uniqueFriendIds = [...new Set(friendIds)];
    const shares: ListShare[] = [];

    for (const friendId of uniqueFriendIds) {
      if (friendId === ownerId) {
        continue;
      }

      const areFriends = await this.friendRepo.areFriends(ownerId, friendId);
      if (!areFriends) {
        const friendUser = await this.userRepo.findById(friendId);
        const displayName = friendUser ? friendUser.Username : friendId;
        throw new AppError(`${displayName} is not in your friends list`, 400, 'BAD_REQUEST');
      }

      const share = await this.listShareRepo.addShare(listId, friendId, role, 'bulk');
      shares.push(share);

      void this.eventBus.publish(
        new WishlistSharedEvent(
          friendId,
          listId,
          role,
          'A friend shared a wishlist with you.',
          ownerId
        )
      ).catch(err => console.error('[Notifications] Failed to publish list_shared event:', err));
    }

    return shares;
  }
}
