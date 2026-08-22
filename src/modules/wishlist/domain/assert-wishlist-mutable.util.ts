import { AppError } from '@/common/middlewares/error.middleware';
import type { Wishlist } from './wishlist.entity';
import { WishlistEntity } from './wishlist.entity';

/** Throws AppError 400 if the wishlist is inactive or past ExpiresAt. */
export function assertWishlistMutable(wishlist: Wishlist): void {
  const entity = WishlistEntity.from(wishlist);

  if (!entity.IsActive || entity.isExpired()) {
    throw new AppError(
      'Wishlist is expired or archived',
      400,
      'BAD_REQUEST'
    );
  }
}
