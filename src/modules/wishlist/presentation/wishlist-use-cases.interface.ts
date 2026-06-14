import type { CreateWishlistUseCase } from '../application/create-wishlist.use-case';
import type { ListWishlistsUseCase } from '../application/list-wishlists.use-case';
import type { CreatePriorityUseCase } from '../application/create-priority.use-case';
import type { ListPrioritiesUseCase } from '../application/list-priorities.use-case';
import type { ListExpiredWishlistsUseCase } from '../application/list-expired-wishlists.use-case';
import type { ShareWishlistUseCase } from '../application/share-wishlist.use-case';
import type { DeactivateWishlistUseCase } from '../application/deactivate-wishlist.use-case';
import type { GetWishlistUseCase } from '../application/get-wishlist.use-case';

export interface WishlistUseCases {
  createWishlist: CreateWishlistUseCase;
  listWishlists: ListWishlistsUseCase;
  createPriority: CreatePriorityUseCase;
  listPriorities: ListPrioritiesUseCase;
  listExpiredWishlists: ListExpiredWishlistsUseCase;
  shareWishlist: ShareWishlistUseCase;
  deactivateWishlist: DeactivateWishlistUseCase;
  getWishlist: GetWishlistUseCase;
}
