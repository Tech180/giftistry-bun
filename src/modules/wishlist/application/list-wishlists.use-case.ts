import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';

export type WishlistBucket = 'my' | 'shared' | 'archive' | 'all';

export interface ListWishlistsQuery {
  bucket?: WishlistBucket;
  q?: string;
}

export interface ListWishlistsCounts {
  My: number;
  Shared: number;
  Archive: number;
}

export interface ListWishlistsResult {
  Wishlists: Wishlist[];
  Counts: ListWishlistsCounts;
}

function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function classifyBucket(list: Wishlist): 'my' | 'shared' | 'archive' {
  if (isExpired(list.ExpiresAt)) {
    return 'archive';
  }
  if (list.Role === 'owner' || !list.Role) {
    return 'my';
  }
  return 'shared';
}

function matchesQuery(list: Wishlist, q: string): boolean {
  if (!q.trim()) return true;
  const query = q.toLowerCase().trim();
  return (
    list.Title.toLowerCase().includes(query) ||
    (!!list.Category && list.Category.toLowerCase().includes(query)) ||
    (!!list.OwnerFirstName && list.OwnerFirstName.toLowerCase().includes(query))
  );
}

export class ListWishlistsUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(userId: string, query: ListWishlistsQuery = {}): Promise<ListWishlistsResult> {
    const all = await this.wishlistRepo.findByUserId(userId);
    const bucket = query.bucket ?? 'all';
    const q = query.q ?? '';

    const my: Wishlist[] = [];
    const shared: Wishlist[] = [];
    const archive: Wishlist[] = [];

    for (const list of all) {
      const classified = classifyBucket(list);
      if (classified === 'archive') archive.push(list);
      else if (classified === 'shared') shared.push(list);
      else my.push(list);
    }

    const counts: ListWishlistsCounts = {
      My: my.length,
      Shared: shared.length,
      Archive: archive.length,
    };

    let selected: Wishlist[];
    switch (bucket) {
      case 'my':
        selected = my;
        break;
      case 'shared':
        selected = shared;
        break;
      case 'archive':
        selected = archive;
        break;
      case 'all':
      default:
        selected = all;
        break;
    }

    return {
      Wishlists: selected.filter((list) => matchesQuery(list, q)),
      Counts: counts,
    };
  }
}
