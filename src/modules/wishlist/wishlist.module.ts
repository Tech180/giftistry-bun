import { Elysia } from 'elysia';
import { PostgresWishlistRepository } from './infrastructure/postgres-wishlist.repository';
import { PostgresListShareRepository } from './infrastructure/postgres-list-share.repository';
import { sharedPostgresUserRepository } from '@/modules/auth/auth.module';
import { CreateWishlistUseCase } from './application/create-wishlist.use-case';
import { ListWishlistsUseCase } from './application/list-wishlists.use-case';
import { CreatePriorityUseCase } from './application/create-priority.use-case';
import { ListPrioritiesUseCase } from './application/list-priorities.use-case';
import { ListExpiredWishlistsUseCase } from './application/list-expired-wishlists.use-case';
import { ShareWishlistUseCase } from './application/share-wishlist.use-case';
import { DeactivateWishlistUseCase } from './application/deactivate-wishlist.use-case';
import { GetWishlistUseCase } from './application/get-wishlist.use-case';
import { wishlistRoutes } from './presentation/wishlist.routes';

const wishlistRepo = new PostgresWishlistRepository();
const listShareRepo = new PostgresListShareRepository();

const createWishlistUseCase = new CreateWishlistUseCase(wishlistRepo);
const listWishlistsUseCase = new ListWishlistsUseCase(wishlistRepo);
const createPriorityUseCase = new CreatePriorityUseCase(wishlistRepo);
const listPrioritiesUseCase = new ListPrioritiesUseCase(wishlistRepo);
const listExpiredWishlistsUseCase = new ListExpiredWishlistsUseCase(wishlistRepo);
const shareWishlistUseCase = new ShareWishlistUseCase(listShareRepo, sharedPostgresUserRepository);
const deactivateWishlistUseCase = new DeactivateWishlistUseCase(wishlistRepo);
const getWishlistUseCase = new GetWishlistUseCase(wishlistRepo);

export const wishlistModule = new Elysia()
  .use(wishlistRoutes({
    createWishlist: createWishlistUseCase,
    listWishlists: listWishlistsUseCase,
    createPriority: createPriorityUseCase,
    listPriorities: listPrioritiesUseCase,
    listExpiredWishlists: listExpiredWishlistsUseCase,
    shareWishlist: shareWishlistUseCase,
    deactivateWishlist: deactivateWishlistUseCase,
    getWishlist: getWishlistUseCase,
  }));

export { wishlistRepo as sharedPostgresWishlistRepository };
