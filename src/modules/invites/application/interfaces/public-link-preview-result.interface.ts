import type { ListItemsResult } from '@/modules/item';
import type { PublicLinkPreviewWishlist } from './public-link-preview-wishlist.interface';

export interface PublicLinkPreviewResult {
  Wishlist: PublicLinkPreviewWishlist;
  Items: ListItemsResult['Items'];
  Groups: ListItemsResult['Groups'];
  /** Guest clients may open `/ws/invite/:token` for `list.changed` push. */
  SupportsGuestRealtime: boolean;
}
