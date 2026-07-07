import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListShare } from '../domain/list-share.entity';
import { AppError } from '@/common/middlewares/error.middleware';

import { createNotification } from '@/modules/notifications/services/create-notification.service';

export class ShareWishlistUseCase {
  constructor(
    private listShareRepo: ListShareRepository,
    private userRepo: UserRepository
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

    createNotification(
      user.Id,
      'list_shared',
      'Wishlist shared with you',
      'A wishlist has been shared with you.',
      { listId, role }
    ).catch(err => console.error('[Notifications] Failed to create list_shared notification:', err));

    return share;
  }
}
