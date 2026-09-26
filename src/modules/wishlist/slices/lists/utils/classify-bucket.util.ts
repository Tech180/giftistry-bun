import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';
import { isWishlistArchiveEligible } from '../../../domain/utils/is-wishlist-archive-eligible.util';

export function classifyBucket(list: Wishlist): 'my' | 'shared' | 'archive' {
  if (isWishlistArchiveEligible(list)) {
    return 'archive';
  }
  if (list.Role === 'owner' || !list.Role) {
    return 'my';
  }
  return 'shared';
}
