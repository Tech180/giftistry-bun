import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { ItemRepository } from '../domain/ports/item.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class ValidateItemAudienceUseCase {
  constructor(
    private listShareRepo: ListShareRepository,
    private itemRepo: ItemRepository
  ) {}

  async execute(
    listId: string,
    sharedWithUserIds: string[] | undefined | null,
    currentUserId: string,
    isOwner: boolean,
    itemId?: string
  ): Promise<string[]> {
    if (!sharedWithUserIds || sharedWithUserIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(sharedWithUserIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const isSelfOnlyAudience =
      uniqueIds.length === 1 && uniqueIds[0] === currentUserId;
    if (isSelfOnlyAudience) {
      return uniqueIds;
    }

    const shares = await this.listShareRepo.findSharesByListId(listId);
    const allowedUserIds = new Set(shares.map(share => share.UserId));

    for (const userId of uniqueIds) {
      if (!allowedUserIds.has(userId)) {
        throw new AppError(
          'One or more selected users do not have access to this wishlist',
          400,
          'BAD_REQUEST'
        );
      }
    }

    if (itemId && !isOwner) {
      const item = await this.itemRepo.findById(itemId);
      if (!item) {
        throw new AppError('Item not found', 404, 'NOT_FOUND');
      }
      if (item.SuggestedByUserId !== currentUserId) {
        throw new AppError(
          'Forbidden: Only the item suggester or owner can change audience',
          403,
          'FORBIDDEN'
        );
      }
    }

    return uniqueIds;
  }
}
