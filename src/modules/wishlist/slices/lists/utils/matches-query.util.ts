import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';

export function matchesQuery(list: Wishlist, q: string): boolean {
  if (!q.trim()) {
    return true;
  }
  const query = q.toLowerCase().trim();
  return (
    list.Title.toLowerCase().includes(query) ||
    (!!list.Category && list.Category.toLowerCase().includes(query)) ||
    (!!list.OwnerFirstName && list.OwnerFirstName.toLowerCase().includes(query))
  );
}
