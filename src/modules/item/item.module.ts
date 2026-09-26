import { Elysia } from 'elysia';
import { AddItemUseCase } from './slices/catalog/use-cases/add-item.use-case';
import { ListItemsUseCase } from './slices/catalog/use-cases/list-items.use-case';
import { ClaimItemUseCase } from './slices/claims/use-cases/claim-item.use-case';
import { ClaimItemWithLinkedUseCase } from './slices/claims/use-cases/claim-item-with-linked.use-case';
import { AddItemLinkUseCase } from './slices/links/use-cases/add-item-link.use-case';
import { DeleteItemUseCase } from './slices/catalog/use-cases/delete-item.use-case';
import { UpdateItemUseCase } from './slices/catalog/use-cases/update-item.use-case';
import { GetFieldDefinitionsUseCase } from './slices/catalog/use-cases/get-field-definitions.use-case';
import { UnclaimItemUseCase } from './slices/claims/use-cases/unclaim-item.use-case';
import { UnclaimItemWithLinkedUseCase } from './slices/claims/use-cases/unclaim-item-with-linked.use-case';
import { BuildItemClaimProjectionsUseCase } from './slices/claims/use-cases/build-item-claim-projections.use-case';
import { ValidateItemAudienceUseCase } from './slices/catalog/use-cases/validate-item-audience.use-case';
import { AssertItemVisibleUseCase } from './slices/catalog/use-cases/assert-item-visible.use-case';
import { ExtractMetadataUseCase } from './slices/metadata/use-cases/extract-metadata.use-case';
import { EnrichLinkMetadataUseCase } from './slices/metadata/use-cases/enrich-link-metadata.use-case';
import { ExtractItemReviewsUseCase } from './slices/metadata/use-cases/extract-item-reviews.use-case';
import { GetItemReviewsUseCase } from './slices/metadata/use-cases/get-item-reviews.use-case';
import { SummarizeItemDescriptionUseCase } from './slices/metadata/use-cases/summarize-item-description.use-case';
import { ParseImportPreviewUseCase } from './slices/import/use-cases/parse-import-preview.use-case';
import { BulkAddItemsUseCase } from './slices/import/use-cases/bulk-add-items.use-case';
import { SyncItemLinksUseCase } from './slices/links/use-cases/sync-item-links.use-case';
import { SyncItemRelatedUseCase } from './slices/links/use-cases/sync-item-related.use-case';
import { ListItemSubstitutionsUseCase } from './slices/substitutions/use-cases/list-item-substitutions.use-case';
import { CreateOwnerSubstitutionUseCase } from './slices/substitutions/use-cases/create-owner-substitution.use-case';
import { CreateClaimerSubstitutionUseCase } from './slices/substitutions/use-cases/create-claimer-substitution.use-case';
import { UpdateItemSubstitutionUseCase } from './slices/substitutions/use-cases/update-item-substitution.use-case';
import { DeleteItemSubstitutionUseCase } from './slices/substitutions/use-cases/delete-item-substitution.use-case';
import { ReorderOwnerSubstitutionsUseCase } from './slices/substitutions/use-cases/reorder-owner-substitutions.use-case';
import { NotifyClaimersItemRemovedUseCase } from './slices/claims/use-cases/notify-claimers-item-removed.use-case';
import { NotifyGroupFundContributorsUseCase } from './slices/funding/use-cases/notify-group-fund-contributors.use-case';
import { PostGroupFundCommentUseCase } from './slices/funding/use-cases/post-group-fund-comment.use-case';
import { BackfillListReviewsUseCase } from './slices/metadata/use-cases/backfill-list-reviews.use-case';
import { PromoteScrapedImageToPhotosUseCase } from './slices/metadata/use-cases/promote-scraped-image-to-photos.use-case';
import type { ItemModuleDeps } from './interfaces/item-module-deps.interface';
import { itemRoutes } from './presentation/item.routes';

export function createItemModule(deps: ItemModuleDeps) {
  const listChanged = deps.listChanged;

  const extractMetadataUseCase = new ExtractMetadataUseCase(
    deps.metadataScraper,
    deps.metadataPopulator,
    deps.categoryClassifier,
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.wishlistRepo,
    deps.itemRepo,
    deps.serverConfigRepo,
    deps.pageContextFetcher,
    deps.productResearcher
  );
  const promoteScrapedImageToPhotosUseCase = new PromoteScrapedImageToPhotosUseCase(
    deps.itemRepo,
    deps.remoteImageFetcher
  );
  const enrichLinkMetadataUseCase = new EnrichLinkMetadataUseCase(
    deps.metadataScraper,
    deps.itemRepo,
    promoteScrapedImageToPhotosUseCase
  );
  const extractItemReviewsUseCase = new ExtractItemReviewsUseCase(
    deps.itemReviewRepo,
    deps.reviewExtractor,
    deps.itemRepo,
    deps.wishlistRepo,
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.serverConfigRepo
  );
  const getItemReviewsUseCase = new GetItemReviewsUseCase(deps.itemReviewRepo);
  const summarizeItemDescriptionUseCase = new SummarizeItemDescriptionUseCase(
    deps.wishlistRepo,
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.descriptionSummarizer,
    deps.serverConfigRepo
  );
  const parseImportPreviewUseCase = new ParseImportPreviewUseCase(
    deps.importFileTextExtractor,
    deps.itemImportParser,
    deps.wishlistRepo,
    deps.itemRepo,
    deps.userRepo,
    deps.assertUserCanUseCase,
    deps.serverConfigRepo
  );
  const backfillListReviewsUseCase = new BackfillListReviewsUseCase(
    deps.itemReviewRepo,
    extractItemReviewsUseCase,
    deps.serverConfigRepo
  );

  const validateItemAudienceUseCase = new ValidateItemAudienceUseCase(deps.listShareRepo, deps.itemRepo);
  const assertItemVisibleUseCase = new AssertItemVisibleUseCase(
    deps.itemRepo,
    deps.wishlistRepo,
    deps.audienceRepo,
    deps.listShareRepo
  );

  const addItemUseCase = new AddItemUseCase(
    deps.itemRepo,
    deps.audienceRepo,
    enrichLinkMetadataUseCase,
    extractItemReviewsUseCase,
    deps.assertUserCanUseCase,
    deps.wishlistRepo,
    listChanged
  );

  const claimItemUseCase = new ClaimItemUseCase(
    deps.itemRepo,
    deps.wishlistRepo,
    assertItemVisibleUseCase,
    deps.commentRepo && deps.commentRealtime
      ? new PostGroupFundCommentUseCase(deps.commentRepo, deps.commentRealtime)
      : undefined,
    deps.createNotification
      ? new NotifyGroupFundContributorsUseCase(deps.createNotification)
      : undefined,
    listChanged
  );

  const unclaimItemUseCase = new UnclaimItemUseCase(
    deps.itemRepo,
    assertItemVisibleUseCase,
    listChanged
  );

  const notifyClaimersItemRemoved = new NotifyClaimersItemRemovedUseCase(deps.eventBus);

  const useCases = {
    addItem: addItemUseCase,
    listItems: new ListItemsUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.audienceRepo,
      deps.listShareRepo
    ),
    claimItem: claimItemUseCase,
    claimItemWithLinked: new ClaimItemWithLinkedUseCase(
      deps.itemRepo,
      claimItemUseCase,
      assertItemVisibleUseCase,
      deps.wishlistRepo,
      listChanged
    ),
    addItemLink: new AddItemLinkUseCase(
      deps.itemRepo,
      assertItemVisibleUseCase,
      enrichLinkMetadataUseCase,
      extractItemReviewsUseCase,
      listChanged
    ),
    deleteItem: new DeleteItemUseCase(
      deps.itemRepo,
      assertItemVisibleUseCase,
      notifyClaimersItemRemoved,
      listChanged
    ),
    updateItem: new UpdateItemUseCase(
      deps.itemRepo,
      deps.audienceRepo,
      assertItemVisibleUseCase,
      enrichLinkMetadataUseCase,
      extractItemReviewsUseCase,
      deps.assertUserCanUseCase,
      notifyClaimersItemRemoved,
      listChanged
    ),
    getFieldDefinitions: new GetFieldDefinitionsUseCase(deps.fieldRepo, deps.serverConfigRepo),
    unclaimItem: unclaimItemUseCase,
    unclaimItemWithLinked: new UnclaimItemWithLinkedUseCase(
      deps.itemRepo,
      assertItemVisibleUseCase,
      unclaimItemUseCase,
      listChanged
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
    syncItemLinks: new SyncItemLinksUseCase(deps.itemRepo, deps.wishlistRepo, listChanged),
    syncItemRelated: new SyncItemRelatedUseCase(deps.itemRepo, listChanged),
    listItemSubstitutions: new ListItemSubstitutionsUseCase(deps.itemRepo, deps.wishlistRepo),
    createOwnerSubstitution: new CreateOwnerSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.assertUserCanUseCase,
      deps.listShareRepo,
      listChanged
    ),
    createClaimerSubstitution: new CreateClaimerSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.assertUserCanUseCase,
      deps.listShareRepo,
      listChanged
    ),
    updateItemSubstitution: new UpdateItemSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.assertUserCanUseCase,
      deps.listShareRepo,
      listChanged
    ),
    deleteItemSubstitution: new DeleteItemSubstitutionUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      notifyClaimersItemRemoved,
      deps.listShareRepo,
      listChanged
    ),
    reorderOwnerSubstitutions: new ReorderOwnerSubstitutionsUseCase(
      deps.itemRepo,
      deps.wishlistRepo,
      deps.listShareRepo,
      listChanged
    ),
    promoteScrapedImageToPhotos: promoteScrapedImageToPhotosUseCase,
  };

  const module = new Elysia().use(
    itemRoutes({ useCases, middleware: deps.middleware })
  );

  return {
    module,
    useCases,
    backfillListReviews: backfillListReviewsUseCase,
    extractItemReviews: extractItemReviewsUseCase,
  };
}
