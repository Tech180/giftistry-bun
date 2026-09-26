import type { Wishlist } from '@/modules/wishlist';
import type { Item } from './interfaces/item.interface';
import type { ItemAudienceUser } from './interfaces/item-audience-user.interface';
import type { ItemCustomFieldsColumns } from './interfaces/item-custom-fields-columns.interface';
import type { ItemPhoto } from './interfaces/item-photo.interface';
import type { ItemVariationColumn } from './interfaces/item-variation-column.interface';
import {
  canUserViewItem,
  isItemSuggestion,
  parseOtherUsersCanSee,
} from './utils/item-visibility.util';

export class ItemEntity implements Item {
  Id!: string;
  ListId!: string;
  PriorityId!: string | null;
  SuggestedByUserId!: string | null;
  SuggestedByUsername?: string | null;
  SuggestedByFirstName?: string | null;
  SuggestedByLastName?: string | null;
  Name!: string;
  Description!: string | null;
  IsHiddenIdea!: boolean;
  IsSuggestion?: boolean;
  Category!: string;
  Priority?: number | null;
  CreatedAt?: Date;
  SharedWith?: ItemAudienceUser[];
  Photos?: ItemPhoto[];
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  OtherUsersCanSee?: boolean | null;
  CustomFields?: ItemCustomFieldsColumns | null;
  Variations?: ItemVariationColumn[] | null;
  LinkedItemIds?: string[];
  RelatedItemIds?: string[];
  AllowSubstitutions?: boolean;
  IsSubstitution?: boolean;
  SubstitutionForItemId?: string | null;

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
    if (this.OtherUsersCanSee !== undefined && this.OtherUsersCanSee !== null) {
      return this.OtherUsersCanSee !== false;
    }
    return parseOtherUsersCanSee(this.Description);
  }

  canUserView(wishlist: Wishlist, currentUserId: string | null, audienceUserIds: string[]): boolean {
    return canUserViewItem({
      item: this,
      wishlist,
      currentUserId,
      audienceUserIds,
    });
  }
}
