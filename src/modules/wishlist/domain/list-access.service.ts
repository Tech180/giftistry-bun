import type { ListShareRepository } from './ports/list-share.repository';
import type { ListAccessRepository } from './ports/list-access.repository';
import type { ListAccessContext } from './interfaces/list-access-context.interface';
import { DomainError } from '@/common/domain/errors/domain-error';

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
      throw new DomainError('List or Item not found', 'NOT_FOUND');
    }

    const accessInfo = await this.listAccessRepo.findAccessInfo(listId);
    if (!accessInfo) {
      throw new DomainError('List not found', 'NOT_FOUND');
    }

    if (accessInfo.ownerDisabled) {
      throw new DomainError('This wishlist is unavailable because the owner account is disabled', 'FORBIDDEN');
    }

    let role = await this.listShareRepo.getRole(listId, userId);

    if (!role && accessInfo.ownerId === userId) {
      role = 'owner';
    }

    if (!role) {
      throw new DomainError('Forbidden: You do not have access to this wishlist', 'FORBIDDEN');
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
