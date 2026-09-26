import type { WishlistBucket } from './wishlist-bucket.type';

export interface ListWishlistsQuery {
  bucket?: WishlistBucket;
  q?: string;
}
