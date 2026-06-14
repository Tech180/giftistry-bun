import { Elysia } from 'elysia';
import { PostgresItemRepository } from './infrastructure/postgres-item.repository';
import { sharedPostgresWishlistRepository } from '@/modules/wishlist/wishlist.module';
import { AddItemUseCase } from './application/add-item.use-case';
import { ListItemsUseCase } from './application/list-items.use-case';
import { ClaimItemUseCase } from './application/claim-item.use-case';
import { AddItemLinkUseCase } from './application/add-item-link.use-case';
import { itemRoutes } from './presentation/item.routes';

const itemRepo = new PostgresItemRepository();

const addItemUseCase = new AddItemUseCase(itemRepo);
const listItemsUseCase = new ListItemsUseCase(itemRepo, sharedPostgresWishlistRepository);
const claimItemUseCase = new ClaimItemUseCase(itemRepo, sharedPostgresWishlistRepository);
const addItemLinkUseCase = new AddItemLinkUseCase(itemRepo);

export const itemModule = new Elysia()
  .use(itemRoutes({
    addItem: addItemUseCase,
    listItems: listItemsUseCase,
    claimItem: claimItemUseCase,
    addItemLink: addItemLinkUseCase,
  }));

export { itemRepo as sharedPostgresItemRepository };
