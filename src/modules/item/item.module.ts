import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import type { ItemRepository } from './domain/ports/item.repository';
import type { ItemAudienceRepository } from './domain/ports/item-audience.repository';
import type { ItemFieldRepository } from './domain/ports/item-field.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { MetadataScraper } from './domain/ports/metadata-scraper.port';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import { PostgresItemReviewRepository } from './infrastructure/postgres-item-review.repository';
import { GeminiReviewExtractor } from './infrastructure/gemini-review-extractor';
import { AddItemUseCase } from './application/add-item.use-case';
import { ListItemsUseCase } from './application/list-items.use-case';
import { ClaimItemUseCase } from './application/claim-item.use-case';
import { ClaimItemWithLinkedUseCase } from './application/claim-item-with-linked.use-case';
import { AddItemLinkUseCase } from './application/add-item-link.use-case';
import { DeleteItemUseCase } from './application/delete-item.use-case';
import { UpdateItemUseCase } from './application/update-item.use-case';
import { GetFieldDefinitionsUseCase } from './application/get-field-definitions.use-case';
import { UnclaimItemUseCase } from './application/unclaim-item.use-case';
import { UnclaimItemWithLinkedUseCase } from './application/unclaim-item-with-linked.use-case';
import { BuildItemClaimProjectionsUseCase } from './application/build-item-claim-projections.use-case';
import { ValidateItemAudienceUseCase } from './application/validate-item-audience.use-case';
import { AssertItemVisibleUseCase } from './application/assert-item-visible.use-case';
import { ExtractMetadataUseCase } from './application/extract-metadata.use-case';
import { EnrichLinkMetadataUseCase } from './application/enrich-link-metadata.use-case';
import { ExtractItemReviewsUseCase } from './application/extract-item-reviews.use-case';
import { GetItemReviewsUseCase } from './application/get-item-reviews.use-case';
import { SummarizeItemDescriptionUseCase } from './application/summarize-item-description.use-case';
import { ParseImportPreviewUseCase } from './application/parse-import-preview.use-case';
import { BulkAddItemsUseCase } from './application/bulk-add-items.use-case';
import { SyncItemLinksUseCase } from './application/sync-item-links.use-case';
import { SyncItemRelatedUseCase } from './application/sync-item-related.use-case';
import { ListItemSubstitutionsUseCase } from './application/list-item-substitutions.use-case';
import { CreateOwnerSubstitutionUseCase } from './application/create-owner-substitution.use-case';
import { CreateClaimerSubstitutionUseCase } from './application/create-claimer-substitution.use-case';
import { UpdateItemSubstitutionUseCase } from './application/update-item-substitution.use-case';
import { DeleteItemSubstitutionUseCase } from './application/delete-item-substitution.use-case';
import { ReorderOwnerSubstitutionsUseCase } from './application/reorder-owner-substitutions.use-case';
import { NotifyClaimersItemRemovedUseCase } from './application/notify-claimers-item-removed.use-case';
import { NotifyGroupFundContributorsUseCase } from './application/notify-group-fund-contributors.use-case';
import { PostGroupFundCommentUseCase } from './application/post-group-fund-comment.use-case';
import { GeminiDescriptionSummarizer } from './infrastructure/gemini-description-summarizer';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/create-notification.use-case';
import type { CommentRepository } from '@/modules/comment/domain/ports/comment.repository';
import { GeminiMetadataPopulator } from './infrastructure/gemini-metadata-populator';
import { GeminiCategoryClassifier } from './infrastructure/gemini-category-classifier';
import { GeminiItemImportParser } from './infrastructure/gemini-item-import-parser';
import { DefaultImportFileTextExtractor } from './infrastructure/import-file-text-extractor';
import { HttpPageContextFetcher } from './infrastructure/http-page-context-fetcher';
import { PlaywrightProductResearcher } from './infrastructure/playwright-product-researcher';
import { FetchRemoteImageAsDataUrl } from './infrastructure/fetch-remote-image-as-data-url';
import { PromoteScrapedImageToPhotosUseCase } from './application/promote-scraped-image-to-photos.use-case';
import { itemRoutes } from './presentation/item.routes';

export interface ItemModuleDeps {
  itemRepo: ItemRepository;
  audienceRepo: ItemAudienceRepository;
  fieldRepo: ItemFieldRepository;
  wishlistRepo: WishlistRepository;
  listShareRepo: ListShareRepository;
  userRepo: UserRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  metadataScraper: MetadataScraper;
  serverConfigRepo: ServerConfigRepository;
  middleware: RouteMiddleware;
  createNotification?: CreateNotificationUseCase;
  commentRepo?: CommentRepository;
}

export function createItemModule(deps: ItemModuleDeps) {
  const itemReviewRepo = new PostgresItemReviewRepository();
  const reviewExtractor = new GeminiReviewExtractor();
  const pageContextFetcher = new HttpPageContextFetcher();
  const productResearcher = new PlaywrightProductResearcher();

  const extractMetadataUseCase = new ExtractMetadataUseCase(
    deps.metadataScraper,
    new GeminiMetadataPopulator(),
    new GeminiCategoryClassifier(),
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.wishlistRepo,
    deps.itemRepo,
    deps.serverConfigRepo,
    pageContextFetcher,
    productResearcher
  );
  const promoteScrapedImageToPhotosUseCase = new PromoteScrapedImageToPhotosUseCase(
    deps.itemRepo,
    new FetchRemoteImageAsDataUrl()
  );
  const enrichLinkMetadataUseCase = new EnrichLinkMetadataUseCase(
    deps.metadataScraper,
    deps.itemRepo,
    promoteScrapedImageToPhotosUseCase
  );
  const extractItemReviewsUseCase = new ExtractItemReviewsUseCase(
    itemReviewRepo,
    reviewExtractor,
    deps.itemRepo,
    deps.wishlistRepo,
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.serverConfigRepo
  );
  const getItemReviewsUseCase = new GetItemReviewsUseCase(itemReviewRepo);
  const summarizeItemDescriptionUseCase = new SummarizeItemDescriptionUseCase(
    deps.wishlistRepo,
    deps.userRepo,
    deps.assertUserCanUseCase,
    new GeminiDescriptionSummarizer(),
    deps.serverConfigRepo
  );
  const parseImportPreviewUseCase = new ParseImportPreviewUseCase(
    new DefaultImportFileTextExtractor(),
    new GeminiItemImportParser(),
    deps.wishlistRepo,
    deps.itemRepo,
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.serverConfigRepo
  );

  const validateItemAudienceUseCase = new ValidateItemAudienceUseCase(deps.listShareRepo, deps.itemRepo);
  const assertItemVisibleUseCase = new AssertItemVisibleUseCase(
    deps.itemRepo,
    deps.wishlistRepo,
    deps.audienceRepo
  );

  const addItemUseCase = new AddItemUseCase(
    deps.itemRepo,
    deps.audienceRepo,
    enrichLinkMetadataUseCase,
    extractItemReviewsUseCase,
    deps.assertUserCanUseCase,
    deps.wishlistRepo
  );

  const claimItemUseCase = new ClaimItemUseCase(
    deps.itemRepo,
    deps.wishlistRepo,
    assertItemVisibleUseCase,
    deps.commentRepo ? new PostGroupFundCommentUseCase(deps.commentRepo) : undefined,
    deps.createNotification
      ? new NotifyGroupFundContributorsUseCase(deps.createNotification)
      : undefined
  );

  const unclaimItemUseCase = new UnclaimItemUseCase(
    deps.itemRepo,
    assertItemVisibleUseCase
  );

  const notifyClaimersItemRemoved = deps.createNotification
    ? new NotifyClaimersItemRemovedUseCase(deps.createNotification)
    : undefined;

  const useCases = {
    addItem: addItemUseCase,
    listItems: new ListItemsUseCase(deps.itemRepo, deps.wishlistRepo, deps.audienceRepo),
    claimItem: claimItemUseCase,
    claimItemWithLinked: new ClaimItemWithLinkedUseCase(
      deps.itemRepo,
      claimItemUseCase,
      assertItemVisibleUseCase,
      deps.wishlistRepo
    ),
    addItemLink: new AddItemLinkUseCase(
      deps.itemRepo,
      assertItemVisibleUseCase,
      enrichLinkMetadataUseCase,
      extractItemReviewsUseCase
    ),
    deleteItem: new DeleteItemUseCase(
      deps.itemRepo,
      assertItemVisibleUseCase,
      notifyClaimersItemRemoved
    ),
    updateItem: new UpdateItemUseCase(
      deps.itemRepo,
      deps.audienceRepo,
      assertItemVisibleUseCase,
      enrichLinkMetadataUseCase,
      extractItemReviewsUseCase,
      deps.assertUserCanUseCase,
      notifyClaimersItemRemoved
    ),
    getFieldDefinitions: new GetFieldDefinitionsUseCase(deps.fieldRepo, deps.serverConfigRepo),
    unclaimItem: unclaimItemUseCase,
    unclaimItemWithLinked: new UnclaimItemWithLinkedUseCase(
      deps.itemRepo,
      assertItemVisibleUseCase,
      unclaimItemUseCase
    ),
    buildItemClaimProjections: new BuildItemClaimProjectionsUseCase(
      deps.itemRepo,
      deps.wishlistRepo
    ),
    validateItemAudience: validateItemAudienceUseCase,
    extractMetadata: extractMetadataUseCase,
    getItemReviews: getItemReviewsUseCase,
    summarizeItemDescription: summarizeItemDescriptionUseCase,
    parseImportPreview: parseImportPreviewUseCase,
    bulkAddItems: new BulkAddItemsUseCase(addItemUseCase, validateItemAudienceUseCase),
    syncItemLinks: new SyncItemLinksUseCase(deps.itemRepo, deps.wishlistRepo),
    syncItemRelated: new SyncItemRelatedUseCase(deps.itemRepo),
    listItemSubstitutions: new ListItemSubstitutionsUseCase(deps.itemRepo, deps.wishlistRepo),
    createOwnerSubstitution: new CreateOwnerSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.assertUserCanUseCase
    ),
    createClaimerSubstitution: new CreateClaimerSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.assertUserCanUseCase
    ),
    updateItemSubstitution: new UpdateItemSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.assertUserCanUseCase
    ),
    deleteItemSubstitution: new DeleteItemSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      notifyClaimersItemRemoved
    ),
    reorderOwnerSubstitutions: new ReorderOwnerSubstitutionsUseCase(
      deps.itemRepo,
      deps.wishlistRepo
    ),
    promoteScrapedImageToPhotos: promoteScrapedImageToPhotosUseCase,
  };

  const module = new Elysia().use(
    itemRoutes(
      useCases,
      deps.middleware
    )
  );

  return { module, useCases };
}
