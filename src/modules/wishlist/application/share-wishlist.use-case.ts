import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListShare } from '../domain/list-share.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import { WishlistSharedEvent } from '../domain/events/wishlist-shared.event';

export class ShareWishlistUseCase {
  constructor(
    private listShareRepo: ListShareRepository,
    private userRepo: UserRepository,
    private eventBus: EventBus
  ) {}

  async execute(listId: string, email: string, role: 'viewer' | 'collaborator'): Promise<ListShare> {
    if (!email || !role) {
      throw new AppError('Email and role are required', 400, 'BAD_REQUEST');
    }
    if (role !== 'viewer' && role !== 'collaborator') {
      throw new AppError('Invalid role. Role must be either viewer or collaborator', 400, 'BAD_REQUEST');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError('User with this email not found', 404, 'NOT_FOUND');
    }

    const share = await this.listShareRepo.addShare(listId, user.Id, role);

    void this.eventBus.publish(
      new WishlistSharedEvent(user.Id, listId, role, 'A wishlist has been shared with you.')
    ).catch(err => console.error('[Notifications] Failed to publish list_shared event:', err));

    return share;
  }
}
