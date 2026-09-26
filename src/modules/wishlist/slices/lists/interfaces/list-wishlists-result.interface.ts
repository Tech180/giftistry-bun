import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';
import type { ListWishlistsCounts } from './list-wishlists-counts.interface';

export interface ListWishlistsResult {
  Wishlists: Wishlist[];
  Counts: ListWishlistsCounts;
}
