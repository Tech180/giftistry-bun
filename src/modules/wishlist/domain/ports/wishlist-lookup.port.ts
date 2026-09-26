import type { Wishlist } from '../interfaces/wishlist.interface';

/** Published lookup for other modules that need wishlist identity/flags. */
export interface WishlistLookupPort {
  findById(id: string): Promise<Wishlist | null>;
}
