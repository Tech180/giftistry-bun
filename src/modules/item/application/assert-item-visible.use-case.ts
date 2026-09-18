import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { Item } from '../domain/item.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';
import type { ListRoleLevel } from '@/common/domain/list-role.vo';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserViewItem } from '../domain/item-visibility.service';

export interface VisibleItemContext {
  item: Item;
  wishlist: Wishlist;
  audienceUserIds: string[];
  listRole: ListRoleLevel | null;
}

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
