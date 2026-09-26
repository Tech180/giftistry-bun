import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';
import type { ListWishlistsQuery } from '../interfaces/list-wishlists-query.interface';
import type { ListWishlistsCounts } from '../interfaces/list-wishlists-counts.interface';
import type { ListWishlistsResult } from '../interfaces/list-wishlists-result.interface';
import { classifyBucket } from '../utils/classify-bucket.util';
import { matchesQuery } from '../utils/matches-query.util';

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
