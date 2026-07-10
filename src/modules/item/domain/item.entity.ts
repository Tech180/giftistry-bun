import type { Item } from './item.entity';
import type { ItemLink, Claim } from './item.entity';
import type { ItemAudienceUser } from './item-audience.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';
import { WishlistEntity } from '@/modules/wishlist/domain/wishlist.entity';
import {
  canUserViewItem,
  isItemSuggestion,
  parseOtherUsersCanSee,
  type ItemVisibilityContext,
} from './item-visibility.service';

export type { ItemVisibilityContext };
export { canUserViewItem, isItemSuggestion, parseOtherUsersCanSee };

export class ItemEntity implements Item {
  Id!: string;
  ListId!: string;
  PriorityId!: string | null;
  SuggestedByUserId!: string | null;
  SuggestedByUsername?: string | null;
  Name!: string;
  Description!: string | null;
  IsHiddenIdea!: boolean;
  IsSuggestion?: boolean;
  Category!: string;
  Priority?: number | null;
  CreatedAt?: Date;
  SharedWith?: ItemAudienceUser[];

  constructor(data: Item) {
    Object.assign(this, data);
  }

  static from(data: Item): ItemEntity {
    return new ItemEntity(data);
  }

  toPlain(): Item {
    return { ...this };
  }

  isSuggestion(wishlistOwnerId: string): boolean {
    return isItemSuggestion(this, wishlistOwnerId);
  }

  otherUsersCanSee(): boolean {
    return parseOtherUsersCanSee(this.Description);
  }

  canUserView(wishlist: Wishlist, currentUserId: string, audienceUserIds: string[]): boolean {
    return canUserViewItem({
      item: this,
      wishlist,
      currentUserId,
      audienceUserIds,
    });
  }
}

export type { ItemLink, Claim };
