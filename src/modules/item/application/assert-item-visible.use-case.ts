import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserViewItem } from '../domain/item-visibility.service';

export class AssertItemVisibleUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private audienceRepo: ItemAudienceRepository
  ) {}

  async execute(itemId: string, currentUserId: string): Promise<void> {
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
  }
}
