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
import { PostgresItemRepository } from '@/modules/item/infrastructure/postgres-item.repository';
import { PostgresCommentRepository } from '@/modules/comment/infrastructure/postgres-comment.repository';
import { wishlistRoutes } from './presentation/wishlist.routes';

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
  }));

export { wishlistRepo as sharedPostgresWishlistRepository };
