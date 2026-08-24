import type { Wishlist } from './wishlist.entity';

function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/** True when the list belongs in the archive bucket (inactive or past expiry). */
export function isWishlistArchiveEligible(
  list: Pick<Wishlist, 'IsActive' | 'ExpiresAt'>
): boolean {
  return list.IsActive === false || isExpired(list.ExpiresAt);
}
