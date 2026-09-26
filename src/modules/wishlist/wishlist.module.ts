import { Elysia } from 'elysia';
import type { ListShareRepository } from './domain/ports/list-share.repository';
import type { ListAccessRepository } from './domain/ports/list-access.repository';
import type { WishlistModuleDeps } from './interfaces/wishlist-module-deps.interface';
import type { CheckListAccessUseCase } from './slices/access/use-cases/check-list-access.use-case';
import type { UseCases } from './presentation/interfaces/use-cases.interface';
import { ListAccessService } from './domain/list-access.service';
import { CheckListAccessUseCase as CheckListAccessUseCaseImpl } from './slices/access/use-cases/check-list-access.use-case';
import { CreateWishlistUseCase } from './slices/lists/use-cases/create-wishlist.use-case';
import { ListWishlistsUseCase } from './slices/lists/use-cases/list-wishlists.use-case';
import { CreatePriorityUseCase } from './slices/priorities/use-cases/create-priority.use-case';
import { ListPrioritiesUseCase } from './slices/priorities/use-cases/list-priorities.use-case';
import { DeletePriorityUseCase } from './slices/priorities/use-cases/delete-priority.use-case';
import { ListExpiredWishlistsUseCase } from './slices/lists/use-cases/list-expired-wishlists.use-case';
import { DeactivateWishlistUseCase } from './slices/lists/use-cases/deactivate-wishlist.use-case';
import { ActivateWishlistUseCase } from './slices/lists/use-cases/activate-wishlist.use-case';
import { GetWishlistUseCase } from './slices/lists/use-cases/get-wishlist.use-case';
import { RolloverWishlistUseCase } from './slices/rollover/use-cases/rollover-wishlist.use-case';
import { DuplicateWishlistUseCase } from './slices/rollover/use-cases/duplicate-wishlist.use-case';
import { UpdateWishlistUseCase } from './slices/lists/use-cases/update-wishlist.use-case';
import { DeleteWishlistUseCase } from './slices/lists/use-cases/delete-wishlist.use-case';
import { ListListSharesUseCase } from './slices/shares/use-cases/list-list-shares.use-case';
import { UpdateListShareUseCase } from './slices/shares/use-cases/update-list-share.use-case';
import { RemoveListShareUseCase } from './slices/shares/use-cases/remove-list-share.use-case';
import { BulkShareWishlistUseCase } from './slices/shares/use-cases/bulk-share-wishlist.use-case';
import { ExportWishlistPdfUseCase } from './slices/export/use-cases/export-wishlist-pdf.use-case';
import { ExportWishlistDataUseCase } from './slices/export/use-cases/export-wishlist-data.use-case';
import { wishlistRoutes } from './presentation/wishlist.routes';

export function createWishlistModule(deps: WishlistModuleDeps) {
  const listChanged = deps.listChanged;
  const listItemsUseCase = deps.listItems;
  const backfillListReviewsUseCase = deps.backfillListReviews;
  const themeResolver = deps.themeResolver;
  const pdfGenerator = deps.pdfGenerator;

  const rolloverWishlist = new RolloverWishlistUseCase(
    deps.wishlistRepo,
    deps.listShareRepo,
    deps.itemRepo,
    deps.commentRepo
  );

  const duplicateWishlist = new DuplicateWishlistUseCase(
    deps.wishlistRepo,
    deps.itemRepo,
    deps.itemAudienceRepo,
    deps.userRepo,
    deps.assertCanCreateWishlistUseCase,
    deps.assertUserCanUseCase,
    deps.serverConfigRepo
  );

  const useCases: UseCases = {
    createWishlist: new CreateWishlistUseCase(
      deps.wishlistRepo,
      deps.userRepo,
      deps.assertCanCreateWishlistUseCase,
      deps.assertUserCanUseCase,
      deps.serverConfigRepo
    ),
    listWishlists: new ListWishlistsUseCase(deps.wishlistRepo),
    createPriority: new CreatePriorityUseCase(deps.wishlistRepo),
    listPriorities: new ListPrioritiesUseCase(deps.wishlistRepo),
    deletePriority: new DeletePriorityUseCase(deps.wishlistRepo),
    listExpiredWishlists: new ListExpiredWishlistsUseCase(deps.wishlistRepo),
    deactivateWishlist: new DeactivateWishlistUseCase(deps.wishlistRepo),
    activateWishlist: new ActivateWishlistUseCase(deps.wishlistRepo),
    getWishlist: new GetWishlistUseCase(deps.wishlistRepo, rolloverWishlist),
    rolloverWishlist,
    duplicateWishlist,
    updateWishlist: new UpdateWishlistUseCase(
      deps.wishlistRepo,
      deps.userRepo,
      deps.assertUserCanUseCase,
      backfillListReviewsUseCase,
      deps.serverConfigRepo,
      listChanged
    ),
    deleteWishlist: new DeleteWishlistUseCase(deps.wishlistRepo, deps.jobRepo),
    listListShares: new ListListSharesUseCase(deps.listShareRepo),
    updateListShare: new UpdateListShareUseCase(deps.listShareRepo),
    removeListShare: new RemoveListShareUseCase(deps.listShareRepo, deps.itemAudienceRepo),
    bulkShareWishlist: new BulkShareWishlistUseCase(
      deps.listShareRepo,
      deps.friendRepo,
      deps.userRepo,
      deps.eventBus
    ),
    exportWishlistPdf: new ExportWishlistPdfUseCase(
      deps.wishlistRepo,
      listItemsUseCase,
      deps.userRepo,
      themeResolver,
      pdfGenerator
    ),
    exportWishlistData: new ExportWishlistDataUseCase(
      deps.wishlistRepo,
      listItemsUseCase,
      deps.userRepo
    ),
  };

  const module = new Elysia().use(
    wishlistRoutes(useCases, deps.invitesUseCases, deps.middleware)
  );

  return { module, useCases };
}

export function createCheckListAccessUseCase(
  listShareRepo: ListShareRepository,
  listAccessRepo: ListAccessRepository
): CheckListAccessUseCase {
  const listAccessService = new ListAccessService(listAccessRepo, listShareRepo);
  return new CheckListAccessUseCaseImpl(listAccessService);
}
