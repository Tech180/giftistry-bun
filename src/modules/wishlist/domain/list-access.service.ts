import type { ListShareRepository } from './ports/list-share.repository';
import type { ListAccessRepository, ListAccessContext } from './ports/list-access.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class ListAccessService {
  constructor(
    private listAccessRepo: ListAccessRepository,
    private listShareRepo: ListShareRepository
  ) {}

  async resolve(
    userId: string,
    target: { listId?: string; itemId?: string }
  ): Promise<ListAccessContext> {
    let listId = target.listId;
    if (!listId && target.itemId) {
      listId = (await this.listAccessRepo.findListIdByItemId(target.itemId)) || undefined;
    }
    if (!listId) {
      throw new AppError('List or Item not found', 404, 'NOT_FOUND');
    }

    const accessInfo = await this.listAccessRepo.findAccessInfo(listId);
    if (!accessInfo) {
      throw new AppError('List not found', 404, 'NOT_FOUND');
    }

    if (accessInfo.ownerDisabled) {
      throw new AppError(
        'This wishlist is unavailable because the owner account is disabled',
        403,
        'FORBIDDEN'
      );
    }

    let role = await this.listShareRepo.getRole(listId, userId);

    if (!role && accessInfo.ownerId === userId) {
      role = 'owner';
    }

    if (!role) {
      throw new AppError('Forbidden: You do not have access to this wishlist', 403, 'FORBIDDEN');
    }

    const isExpired = accessInfo.expiresAt ? new Date() > accessInfo.expiresAt : false;

    return {
      listId,
      role,
      isExpired,
      isActive: accessInfo.isActive,
    };
  }
}
