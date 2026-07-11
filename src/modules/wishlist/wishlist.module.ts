import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import type { WishlistRepository } from './domain/ports/wishlist.repository';
import type { ListShareRepository } from './domain/ports/list-share.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { FriendRepository } from '@/modules/friends/domain/ports/friend.repository';
import type { ItemRepository } from '@/modules/item/domain/ports/item.repository';
import type { ItemAudienceRepository } from '@/modules/item/domain/ports/item-audience.repository';
import type { CommentRepository } from '@/modules/comment/domain/ports/comment.repository';
import type {
  AssertCanCreateWishlistUseCase,
  AssertUserCanUseCase,
} from '@/common/application/user-policy.use-cases';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import type { CheckListAccessUseCase } from './application/check-list-access.use-case';
import { PostgresListAccessRepository } from './infrastructure/postgres-list-access.repository';
import { PostgresItemReviewRepository } from '@/modules/item/infrastructure/postgres-item-review.repository';
import { GeminiReviewExtractor } from '@/modules/item/infrastructure/gemini-review-extractor';
import { ListAccessService } from './domain/list-access.service';
import { CheckListAccessUseCase as CheckListAccessUseCaseImpl } from './application/check-list-access.use-case';
import { CreateWishlistUseCase } from './application/create-wishlist.use-case';
import { ListWishlistsUseCase } from './application/list-wishlists.use-case';
import { CreatePriorityUseCase } from './application/create-priority.use-case';
import { ListPrioritiesUseCase } from './application/list-priorities.use-case';
import { DeletePriorityUseCase } from './application/delete-priority.use-case';
import { ListExpiredWishlistsUseCase } from './application/list-expired-wishlists.use-case';
import { ShareWishlistUseCase } from './application/share-wishlist.use-case';
import { DeactivateWishlistUseCase } from './application/deactivate-wishlist.use-case';
import { GetWishlistUseCase } from './application/get-wishlist.use-case';
import { RolloverWishlistUseCase } from './application/rollover-wishlist.use-case';
import { UpdateWishlistUseCase } from './application/update-wishlist.use-case';
import { DeleteWishlistUseCase } from './application/delete-wishlist.use-case';
import { ListListSharesUseCase } from './application/list-list-shares.use-case';
import { UpdateListShareUseCase } from './application/update-list-share.use-case';
import { RemoveListShareUseCase } from './application/remove-list-share.use-case';
import { BulkShareWishlistUseCase } from './application/bulk-share-wishlist.use-case';
import { BackfillListReviewsUseCase } from '@/modules/item/application/backfill-list-reviews.use-case';
import { ExtractItemReviewsUseCase } from '@/modules/item/application/extract-item-reviews.use-case';
import { wishlistRoutes } from './presentation/wishlist.routes';

export interface WishlistModuleDeps {
  wishlistRepo: WishlistRepository;
  listShareRepo: ListShareRepository;
  userRepo: UserRepository;
  friendRepo: FriendRepository;
  itemRepo: ItemRepository;
  commentRepo: CommentRepository;
  itemAudienceRepo: ItemAudienceRepository;
  assertCanCreateWishlistUseCase: AssertCanCreateWishlistUseCase;
  assertUserCanUseCase: AssertUserCanUseCase;
  eventBus: EventBus;
  invitesUseCases: Parameters<typeof wishlistRoutes>[1];
  middleware: RouteMiddleware;
}

export function createWishlistModule(deps: WishlistModuleDeps) {
  const itemReviewRepo = new PostgresItemReviewRepository();
  const extractItemReviewsUseCase = new ExtractItemReviewsUseCase(
    itemReviewRepo,
    new GeminiReviewExtractor(),
    deps.itemRepo,
    deps.wishlistRepo,
    deps.userRepo,
    deps.assertUserCanUseCase
  );
  const backfillListReviewsUseCase = new BackfillListReviewsUseCase(
    itemReviewRepo,
    extractItemReviewsUseCase
  );

  const module = new Elysia().use(
    wishlistRoutes(
      {
        createWishlist: new CreateWishlistUseCase(
          deps.wishlistRepo,
          deps.userRepo,
          deps.assertCanCreateWishlistUseCase,
          deps.assertUserCanUseCase
        ),
        listWishlists: new ListWishlistsUseCase(deps.wishlistRepo),
        createPriority: new CreatePriorityUseCase(deps.wishlistRepo),
        listPriorities: new ListPrioritiesUseCase(deps.wishlistRepo),
        deletePriority: new DeletePriorityUseCase(deps.wishlistRepo),
        listExpiredWishlists: new ListExpiredWishlistsUseCase(deps.wishlistRepo),
        shareWishlist: new ShareWishlistUseCase(deps.listShareRepo, deps.userRepo, deps.eventBus),
        deactivateWishlist: new DeactivateWishlistUseCase(deps.wishlistRepo),
        getWishlist: new GetWishlistUseCase(deps.wishlistRepo),
        rolloverWishlist: new RolloverWishlistUseCase(
          deps.wishlistRepo,
          deps.listShareRepo,
          deps.itemRepo,
          deps.commentRepo
        ),
        updateWishlist: new UpdateWishlistUseCase(
          deps.wishlistRepo,
          deps.userRepo,
          deps.assertUserCanUseCase,
          backfillListReviewsUseCase
        ),
        deleteWishlist: new DeleteWishlistUseCase(deps.wishlistRepo),
        listListShares: new ListListSharesUseCase(deps.listShareRepo),
        updateListShare: new UpdateListShareUseCase(deps.listShareRepo),
        removeListShare: new RemoveListShareUseCase(deps.listShareRepo, deps.itemAudienceRepo),
        bulkShareWishlist: new BulkShareWishlistUseCase(
          deps.listShareRepo,
          deps.friendRepo,
          deps.userRepo,
          deps.eventBus
        ),
      },
      deps.invitesUseCases,
      deps.middleware
    )
  );

  return { module };
}

export function createCheckListAccessUseCase(
  listShareRepo: ListShareRepository
): CheckListAccessUseCase {
  const listAccessRepo = new PostgresListAccessRepository();
  const listAccessService = new ListAccessService(listAccessRepo, listShareRepo);
  return new CheckListAccessUseCaseImpl(listAccessService);
}
