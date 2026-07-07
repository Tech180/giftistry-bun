import { Elysia } from 'elysia';
import { PostgresWishlistRepository } from './infrastructure/postgres-wishlist.repository';
import { PostgresListShareRepository } from './infrastructure/postgres-list-share.repository';
import { sharedPostgresUserRepository } from '@/modules/auth/auth.module';
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
import { sharedPostgresFriendRepository } from '@/modules/friends/friends.module';
import { wishlistRoutes } from './presentation/wishlist.routes';
import { invitesUseCases } from '@/modules/invites/invites.module';
import { PostgresItemRepository } from '@/modules/item/infrastructure/postgres-item.repository';
import { PostgresCommentRepository } from '@/modules/comment/infrastructure/postgres-comment.repository';

const wishlistRepo = new PostgresWishlistRepository();
const listShareRepo = new PostgresListShareRepository();
const itemRepo = new PostgresItemRepository();
const commentRepo = new PostgresCommentRepository();

const createWishlistUseCase = new CreateWishlistUseCase(wishlistRepo);
const listWishlistsUseCase = new ListWishlistsUseCase(wishlistRepo);
const createPriorityUseCase = new CreatePriorityUseCase(wishlistRepo);
const listPrioritiesUseCase = new ListPrioritiesUseCase(wishlistRepo);
const deletePriorityUseCase = new DeletePriorityUseCase(wishlistRepo);
const listExpiredWishlistsUseCase = new ListExpiredWishlistsUseCase(wishlistRepo);
const shareWishlistUseCase = new ShareWishlistUseCase(listShareRepo, sharedPostgresUserRepository);
const deactivateWishlistUseCase = new DeactivateWishlistUseCase(wishlistRepo);
const getWishlistUseCase = new GetWishlistUseCase(wishlistRepo);
const rolloverWishlistUseCase = new RolloverWishlistUseCase(wishlistRepo, listShareRepo, itemRepo, commentRepo);
const updateWishlistUseCase = new UpdateWishlistUseCase(wishlistRepo);
const deleteWishlistUseCase = new DeleteWishlistUseCase(wishlistRepo);
const listListSharesUseCase = new ListListSharesUseCase(listShareRepo);
const updateListShareUseCase = new UpdateListShareUseCase(listShareRepo);
const removeListShareUseCase = new RemoveListShareUseCase(listShareRepo);
const bulkShareWishlistUseCase = new BulkShareWishlistUseCase(listShareRepo, sharedPostgresFriendRepository, sharedPostgresUserRepository);

export const wishlistModule = new Elysia()
  .use(wishlistRoutes({
    createWishlist: createWishlistUseCase,
    listWishlists: listWishlistsUseCase,
    createPriority: createPriorityUseCase,
    listPriorities: listPrioritiesUseCase,
    deletePriority: deletePriorityUseCase,
    listExpiredWishlists: listExpiredWishlistsUseCase,
    shareWishlist: shareWishlistUseCase,
    deactivateWishlist: deactivateWishlistUseCase,
    getWishlist: getWishlistUseCase,
    rolloverWishlist: rolloverWishlistUseCase,
    updateWishlist: updateWishlistUseCase,
    deleteWishlist: deleteWishlistUseCase,
    listListShares: listListSharesUseCase,
    updateListShare: updateListShareUseCase,
    removeListShare: removeListShareUseCase,
    bulkShareWishlist: bulkShareWishlistUseCase,
  }, invitesUseCases));

export { wishlistRepo as sharedPostgresWishlistRepository };
