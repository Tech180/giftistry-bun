import { DomainError } from '@/common/domain/errors/domain-error';
import type { Wishlist } from '../interfaces/wishlist.interface';
import { WishlistEntity } from '../wishlist.entity';

/** Throws DomainError BAD_REQUEST if the wishlist is inactive or past ExpiresAt. */
export function assertWishlistMutable(wishlist: Wishlist): void {
  const entity = WishlistEntity.from(wishlist);

  if (!entity.IsActive || entity.isExpired()) {
    throw new DomainError('Wishlist is expired or archived', 'BAD_REQUEST');
  }
}
