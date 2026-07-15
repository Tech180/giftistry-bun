import type { CreateWishlistUseCase } from '../application/create-wishlist.use-case';
import type { ListWishlistsUseCase } from '../application/list-wishlists.use-case';
import type { CreatePriorityUseCase } from '../application/create-priority.use-case';
import type { ListPrioritiesUseCase } from '../application/list-priorities.use-case';
import type { DeletePriorityUseCase } from '../application/delete-priority.use-case';
import type { ListExpiredWishlistsUseCase } from '../application/list-expired-wishlists.use-case';
import type { ShareWishlistUseCase } from '../application/share-wishlist.use-case';
import type { DeactivateWishlistUseCase } from '../application/deactivate-wishlist.use-case';
import type { GetWishlistUseCase } from '../application/get-wishlist.use-case';
import type { RolloverWishlistUseCase } from '../application/rollover-wishlist.use-case';
import type { UpdateWishlistUseCase } from '../application/update-wishlist.use-case';
import type { DeleteWishlistUseCase } from '../application/delete-wishlist.use-case';
import type { ListListSharesUseCase } from '../application/list-list-shares.use-case';
import type { UpdateListShareUseCase } from '../application/update-list-share.use-case';
import type { RemoveListShareUseCase } from '../application/remove-list-share.use-case';
import type { BulkShareWishlistUseCase } from '../application/bulk-share-wishlist.use-case';
import type { ExportWishlistPdfUseCase } from '../application/export-wishlist-pdf.use-case';
import type { ExportWishlistDataUseCase } from '../application/export-wishlist-data.use-case';

export interface WishlistUseCases {
  createWishlist: CreateWishlistUseCase;
  listWishlists: ListWishlistsUseCase;
  createPriority: CreatePriorityUseCase;
  listPriorities: ListPrioritiesUseCase;
  deletePriority: DeletePriorityUseCase;
  listExpiredWishlists: ListExpiredWishlistsUseCase;
  shareWishlist: ShareWishlistUseCase;
  deactivateWishlist: DeactivateWishlistUseCase;
  getWishlist: GetWishlistUseCase;
  rolloverWishlist: RolloverWishlistUseCase;
  updateWishlist: UpdateWishlistUseCase;
  deleteWishlist: DeleteWishlistUseCase;
  listListShares: ListListSharesUseCase;
  updateListShare: UpdateListShareUseCase;
  removeListShare: RemoveListShareUseCase;
  bulkShareWishlist: BulkShareWishlistUseCase;
  exportWishlistPdf: ExportWishlistPdfUseCase;
  exportWishlistData: ExportWishlistDataUseCase;
}

