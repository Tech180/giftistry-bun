import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../../../domain/ports/item-audience.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ListShareRepository } from '@/modules/wishlist';
import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';
import { AppError } from '@/common/domain/errors/app-error';
import { canUserViewItem } from '../../../domain/utils/item-visibility.util';
import type { VisibleItemContext } from '../interfaces/visible-item-context.interface';

export class AssertItemVisibleUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private audienceRepo: ItemAudienceRepository,
    private listShareRepo?: ListShareRepository
  ) {}

  async execute(itemId: string, currentUserId: string): Promise<VisibleItemContext> {
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const wishlist = await this.wishlistRepo.findById(item.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const audience = await this.audienceRepo.findByItemId(itemId);
    const audienceUserIds = audience.map(user => user.UserId);

    const visible = canUserViewItem({
      item,
      wishlist,
      currentUserId,
      audienceUserIds,
    });

    if (!visible) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    let listRole: ListRoleLevel | null = null;
    if (wishlist.UserId === currentUserId) {
      listRole = 'owner';
    } else if (this.listShareRepo) {
      listRole = await this.listShareRepo.getRole(wishlist.Id, currentUserId);
    }

    return { item, wishlist, audienceUserIds, listRole };
  }
}
