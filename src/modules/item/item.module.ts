import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import type { ItemRepository } from './domain/ports/item.repository';
import type { ItemAudienceRepository } from './domain/ports/item-audience.repository';
import type { ItemFieldRepository } from './domain/ports/item-field.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { MetadataScraper } from './domain/ports/metadata-scraper.port';
import { PostgresItemReviewRepository } from './infrastructure/postgres-item-review.repository';
import { GeminiReviewExtractor } from './infrastructure/gemini-review-extractor';
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
import { ExtractMetadataUseCase } from './application/extract-metadata.use-case';
import { EnrichLinkMetadataUseCase } from './application/enrich-link-metadata.use-case';
import { ExtractItemReviewsUseCase } from './application/extract-item-reviews.use-case';
import { GetItemReviewsUseCase } from './application/get-item-reviews.use-case';
import { itemRoutes } from './presentation/item.routes';

export interface ItemModuleDeps {
  itemRepo: ItemRepository;
  audienceRepo: ItemAudienceRepository;
  fieldRepo: ItemFieldRepository;
  wishlistRepo: WishlistRepository;
  listShareRepo: ListShareRepository;
  metadataScraper: MetadataScraper;
  middleware: RouteMiddleware;
}

export function createItemModule(deps: ItemModuleDeps) {
  const itemReviewRepo = new PostgresItemReviewRepository();
  const reviewExtractor = new GeminiReviewExtractor();

  const extractMetadataUseCase = new ExtractMetadataUseCase(deps.metadataScraper);
  const enrichLinkMetadataUseCase = new EnrichLinkMetadataUseCase(deps.metadataScraper, deps.itemRepo);
  const extractItemReviewsUseCase = new ExtractItemReviewsUseCase(
    itemReviewRepo,
    reviewExtractor,
    deps.itemRepo,
    deps.wishlistRepo
  );
  const getItemReviewsUseCase = new GetItemReviewsUseCase(itemReviewRepo);

  const validateItemAudienceUseCase = new ValidateItemAudienceUseCase(deps.listShareRepo, deps.itemRepo);
  const assertItemVisibleUseCase = new AssertItemVisibleUseCase(
    deps.itemRepo,
    deps.wishlistRepo,
    deps.audienceRepo
  );

  return new Elysia().use(
    itemRoutes(
      {
        addItem: new AddItemUseCase(
          deps.itemRepo,
          deps.audienceRepo,
          enrichLinkMetadataUseCase,
          extractItemReviewsUseCase
        ),
        listItems: new ListItemsUseCase(deps.itemRepo, deps.wishlistRepo, deps.audienceRepo),
        claimItem: new ClaimItemUseCase(deps.itemRepo, deps.wishlistRepo, assertItemVisibleUseCase),
        addItemLink: new AddItemLinkUseCase(
          deps.itemRepo,
          assertItemVisibleUseCase,
          enrichLinkMetadataUseCase,
          extractItemReviewsUseCase
        ),
        deleteItem: new DeleteItemUseCase(deps.itemRepo, assertItemVisibleUseCase),
        updateItem: new UpdateItemUseCase(deps.itemRepo, deps.audienceRepo, assertItemVisibleUseCase),
        getFieldDefinitions: new GetFieldDefinitionsUseCase(deps.fieldRepo),
        unclaimItem: new UnclaimItemUseCase(deps.itemRepo, assertItemVisibleUseCase),
        validateItemAudience: validateItemAudienceUseCase,
        extractMetadata: extractMetadataUseCase,
        getItemReviews: getItemReviewsUseCase,
      },
      deps.middleware
    )
  );
}
