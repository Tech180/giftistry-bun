import { Elysia } from 'elysia';
import { PostgresItemRepository } from './infrastructure/postgres-item.repository';
import { PostgresItemAudienceRepository } from './infrastructure/postgres-item-audience.repository';
import { PostgresItemFieldRepository } from './infrastructure/postgres-item-field.repository';
import { sharedPostgresWishlistRepository } from '@/modules/wishlist/wishlist.module';
import { sharedPostgresListShareRepository } from '@/modules/wishlist/wishlist.module';
import { AddItemUseCase } from './application/add-item.use-case';
import { ListItemsUseCase } from './application/list-items.use-case';
import { ClaimItemUseCase } from './application/claim-item.use-case';
import { AddItemLinkUseCase } from './application/add-item-link.use-case';
import { DeleteItemUseCase } from './application/delete-item.use-case';
import { UpdateItemUseCase } from './application/update-item.use-case';
import { GetFieldDefinitionsUseCase } from './application/get-field-definitions.use-case';
import { UnclaimItemUseCase } from './application/unclaim-item.use-case';
import { ValidateItemAudienceUseCase } from './application/validate-item-audience.use-case';
import { AssertItemVisibleUseCase } from './application/assert-item-visible.use-case';
import { itemRoutes } from './presentation/item.routes';

const itemRepo = new PostgresItemRepository();
const audienceRepo = new PostgresItemAudienceRepository();
const fieldRepo = new PostgresItemFieldRepository();

const validateItemAudienceUseCase = new ValidateItemAudienceUseCase(
  sharedPostgresListShareRepository,
  itemRepo
);
const assertItemVisibleUseCase = new AssertItemVisibleUseCase(
  itemRepo,
  sharedPostgresWishlistRepository,
  audienceRepo
);

const addItemUseCase = new AddItemUseCase(itemRepo, audienceRepo);
const listItemsUseCase = new ListItemsUseCase(itemRepo, sharedPostgresWishlistRepository, audienceRepo);
const claimItemUseCase = new ClaimItemUseCase(itemRepo, sharedPostgresWishlistRepository, assertItemVisibleUseCase);
const addItemLinkUseCase = new AddItemLinkUseCase(itemRepo, assertItemVisibleUseCase);
const deleteItemUseCase = new DeleteItemUseCase(itemRepo, assertItemVisibleUseCase);
const updateItemUseCase = new UpdateItemUseCase(itemRepo, audienceRepo, assertItemVisibleUseCase);
const getFieldDefinitionsUseCase = new GetFieldDefinitionsUseCase(fieldRepo);
const unclaimItemUseCase = new UnclaimItemUseCase(itemRepo, assertItemVisibleUseCase);

export const itemModule = new Elysia()
  .use(itemRoutes({
    addItem: addItemUseCase,
    listItems: listItemsUseCase,
    claimItem: claimItemUseCase,
    addItemLink: addItemLinkUseCase,
    deleteItem: deleteItemUseCase,
    updateItem: updateItemUseCase,
    getFieldDefinitions: getFieldDefinitionsUseCase,
    unclaimItem: unclaimItemUseCase,
    validateItemAudience: validateItemAudienceUseCase,
  }));

export { itemRepo as sharedPostgresItemRepository };
export { audienceRepo as sharedPostgresItemAudienceRepository };
