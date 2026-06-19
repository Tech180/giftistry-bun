import { Elysia } from 'elysia';
import { PostgresItemRepository } from './infrastructure/postgres-item.repository';
import { PostgresItemFieldRepository } from './infrastructure/postgres-item-field.repository';
import { sharedPostgresWishlistRepository } from '@/modules/wishlist/wishlist.module';
import { AddItemUseCase } from './application/add-item.use-case';
import { ListItemsUseCase } from './application/list-items.use-case';
import { ClaimItemUseCase } from './application/claim-item.use-case';
import { AddItemLinkUseCase } from './application/add-item-link.use-case';
import { DeleteItemUseCase } from './application/delete-item.use-case';
import { UpdateItemUseCase } from './application/update-item.use-case';
import { GetFieldDefinitionsUseCase } from './application/get-field-definitions.use-case';
import { itemRoutes } from './presentation/item.routes';

const itemRepo = new PostgresItemRepository();
const fieldRepo = new PostgresItemFieldRepository();

const addItemUseCase = new AddItemUseCase(itemRepo);
const listItemsUseCase = new ListItemsUseCase(itemRepo, sharedPostgresWishlistRepository);
const claimItemUseCase = new ClaimItemUseCase(itemRepo, sharedPostgresWishlistRepository);
const addItemLinkUseCase = new AddItemLinkUseCase(itemRepo);
const deleteItemUseCase = new DeleteItemUseCase(itemRepo);
const updateItemUseCase = new UpdateItemUseCase(itemRepo);
const getFieldDefinitionsUseCase = new GetFieldDefinitionsUseCase(fieldRepo);

export const itemModule = new Elysia()
  .use(itemRoutes({
    addItem: addItemUseCase,
    listItems: listItemsUseCase,
    claimItem: claimItemUseCase,
    addItemLink: addItemLinkUseCase,
    deleteItem: deleteItemUseCase,
    updateItem: updateItemUseCase,
    getFieldDefinitions: getFieldDefinitionsUseCase,
  }));

export { itemRepo as sharedPostgresItemRepository };
