import type { ItemAudienceUser } from './item-audience.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';
import {
  canUserViewItem,
  isItemSuggestion,
  parseOtherUsersCanSee,
  type ItemVisibilityContext,
} from './item-visibility.service';

export type { ItemVisibilityContext };
export { canUserViewItem, isItemSuggestion, parseOtherUsersCanSee };

export interface ItemLink {
  Id: string;
  ItemId: string;
  Url: string;
  RetailerName: string | null;
  ExtractedPrice: number | null;
  ExtractedImageUrl: string | null;
}

export interface Claim {
  Id: string;
  ItemId: string;
  UserId: string | null;
  Amount: number | null;
  ClaimedByName: string | null;
  Anonymous?: boolean;
  ClaimedAt?: Date;
  Quantity?: number;
  Selection?: string | null;
}

export interface ItemCustomFieldsColumns {
  Predefined?: Record<string, string | null>;
  UserDefined?: Record<string, string>;
}

export interface ItemVariationColumn {
  Name: string;
  Quantity: number;
}

export interface Item {
  Id: string;
  ListId: string;
  PriorityId: string | null;
  SuggestedByUserId: string | null;
  SuggestedByUsername?: string | null;
  Name: string;
  Description: string | null;
  IsHiddenIdea: boolean;
  IsSuggestion?: boolean;
  Category: string;
  Priority?: number | null;
  CreatedAt?: Date;
  SharedWith?: ItemAudienceUser[];
  Links?: ItemLink[];
  /** First-class metadata columns (preferred over Description JSON). */
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  OtherUsersCanSee?: boolean | null;
  CustomFields?: ItemCustomFieldsColumns | null;
  Variations?: ItemVariationColumn[] | null;
  LinkedItemIds?: string[];
}

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
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  OtherUsersCanSee?: boolean | null;
  CustomFields?: ItemCustomFieldsColumns | null;
  Variations?: ItemVariationColumn[] | null;
  LinkedItemIds?: string[];

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

  canUserView(wishlist: Wishlist, currentUserId: string, audienceUserIds: string[]): boolean {
    return canUserViewItem({
      item: this,
      wishlist,
      currentUserId,
      audienceUserIds,
    });
  }
}
