/** Public barrel for the item module. Prefer this over deep imports. */
export type { ItemRepository } from './domain/ports/item.repository';
export type { ItemAudienceRepository } from './domain/ports/item-audience.repository';
export type { ItemFieldRepository } from './domain/ports/item-field.repository';
export type { ItemReviewRepository } from './domain/ports/item-review.repository';
export type { MetadataScraper } from './domain/ports/metadata-scraper.port';
export type { ListItemsPort } from './application/ports/list-items.port';
export type { ItemEnricherPort } from './application/ports/item-enricher.port';
export type { ItemSummarizerPort } from './application/ports/item-summarizer.port';
export type { ItemImporterPort } from './application/ports/item-importer.port';
export type { ListReviewBackfillPort } from './application/ports/list-review-backfill.port';
export type { ItemJobSupportPort } from './application/ports/item-job-support.port';
export type { Item } from './domain/interfaces/item.interface';
export type { ItemLink } from './domain/interfaces/item-link.interface';
export type { Claim } from './domain/interfaces/claim.interface';
export type { ItemPhoto } from './domain/interfaces/item-photo.interface';
export type { ItemMetadataWrite } from './domain/interfaces/item-metadata-write.interface';
export type { CreateClaimInput } from './domain/interfaces/create-claim-input.interface';
export type { UseCases as ItemUseCases } from './application/interfaces/use-cases.interface';
export type { ListItemsResult } from './slices/catalog/interfaces/list-items-result.interface';
export { ListItemsUseCase } from './slices/catalog/use-cases/list-items.use-case';
export { BackfillListReviewsUseCase } from './slices/metadata/use-cases/backfill-list-reviews.use-case';
export { ExtractItemReviewsUseCase } from './slices/metadata/use-cases/extract-item-reviews.use-case';
export type { ItemDescriptionMetadata } from './domain/interfaces/item-description-metadata.interface';
export type { ExtractMetadataPhase } from './domain/types/extract-metadata-phase.type';
export type { ImportedItemPreview } from './domain/interfaces/imported-item-preview.interface';
export type { ImportPreviewResult } from './domain/interfaces/import-preview-result.interface';
export { MAX_BULK_ADD_BATCH } from './slices/import/constants/max-bulk-add-batch.constant';
export { ItemRemovedEvent } from './domain/events/item-removed.event';
export { createItemModule } from './item.module';
export type { ItemModuleDeps } from './interfaces/item-module-deps.interface';
export { mapImportedPreviewToBulkFields, buildImportedItemCreatePayload } from './domain/utils/build-imported-item-metadata.util';
export type { ImportBulkItemPayload } from './domain/interfaces/import-bulk-item-payload.interface';
export {
  collapseFieldMap,
  dedupePredefinedVsUserDefined,
  mergeFieldMapsByNormalizedKey,
  normalizeCustomFieldKey,
} from './domain/utils/collapse-custom-field-maps.util';
export {
  PDF_LINKED_BADGE_PREFIX,
  PDF_RELATED_BADGE_LABEL,
  PDF_RELATED_SYMBOL_PREFIX,
  PDF_RELATED_SYMBOL_SUFFIX,
} from './domain/constants/pdf-relation-badge.constant';
export { formatCategoryLabel, resolveCategoryPresentation } from './domain/utils/format-category-label.util';
export {
  isSoftImportCategory,
  isLockedImportCategory,
  resolveImportCategoryWithOptimize,
} from './domain/utils/is-soft-import-category.util';
export {
  canUserViewItem,
  canUserMutateItem,
  isItemSuggestion,
  parseOtherUsersCanSee,
} from './domain/utils/item-visibility.util';
export type { ItemVisibilityContext } from './domain/interfaces/item-visibility-context.interface';
export { parsePackQuantity, resolveDesiredQuantity } from './domain/utils/parse-pack-quantity.util';
export { resolveItemMetadata, resolvePlainDescriptionText } from './domain/utils/resolve-item-metadata.util';
export {
  getLinkedItemIdsFromExportItem,
  getRelatedItemIdsFromExportItem,
  collectRelationNeighbors,
  resolveRelationGroupItemIds,
  resolveRelationPeerNames,
  buildRelatedGroupSymbolByItemId,
} from './domain/utils/resolve-item-relations.util';
export type { RelationExportItem } from './domain/interfaces/relation-export-item.interface';
export type { RelationIdsGetter } from './domain/types/relation-ids-getter.type';
export { sortWishlistItemsByExportOrder } from './domain/utils/sort-wishlist-items.util';
export type { SortableWishlistItem } from './domain/interfaces/sortable-wishlist-item.interface';
export { parseItemDescription } from './domain/utils/item-description.util';
