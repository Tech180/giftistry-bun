import type { WishlistLinkIndexEntry } from '../interfaces/wishlist-link-index-entry.interface';
import type { WishlistListItemLike } from '../interfaces/wishlist-list-item-like.interface';

/** Index wishlist items by lowercased primary link URL for import resume matching. */
export function buildWishlistLinkIndex(
  listItems: ReadonlyArray<WishlistListItemLike>
): Map<string, WishlistLinkIndexEntry> {
  const wishlistByLink = new Map<string, WishlistLinkIndexEntry>();

  for (const item of listItems) {
    const links = item.Links ?? [];
    for (const link of links) {
      const key = (link.Url || '').trim().toLowerCase();
      if (!key || wishlistByLink.has(key)) {
        continue;
      }
      wishlistByLink.set(key, {
        itemId: String(item.Id),
        name: String(item.Name ?? ''),
        description: (item.Description as string | null) ?? null,
        category: String(item.Category || 'uncategorized'),
        priority: (item.Priority as number | null) ?? null,
        price: link.ExtractedPrice ?? null,
        websiteName: link.RetailerName ?? null,
        linkUrl: link.Url ?? key,
      });
    }
  }

  return wishlistByLink;
}
