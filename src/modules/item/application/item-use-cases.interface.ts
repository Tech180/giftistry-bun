import type { AddItemUseCase } from './add-item.use-case';
import type { ListItemsUseCase } from './list-items.use-case';
import type { ClaimItemUseCase } from './claim-item.use-case';
import type { ClaimItemWithLinkedUseCase } from './claim-item-with-linked.use-case';
import type { AddItemLinkUseCase } from './add-item-link.use-case';
import type { DeleteItemUseCase } from './delete-item.use-case';
import type { UpdateItemUseCase } from './update-item.use-case';
import type { GetFieldDefinitionsUseCase } from './get-field-definitions.use-case';
import type { UnclaimItemUseCase } from './unclaim-item.use-case';
import type { ValidateItemAudienceUseCase } from './validate-item-audience.use-case';
import type { ExtractMetadataUseCase } from './extract-metadata.use-case';
import type { GetItemReviewsUseCase } from './get-item-reviews.use-case';
import type { SummarizeItemDescriptionUseCase } from './summarize-item-description.use-case';
import type { ParseImportPreviewUseCase } from './parse-import-preview.use-case';
import type { BulkAddItemsUseCase } from './bulk-add-items.use-case';
import type { SyncItemLinksUseCase } from './sync-item-links.use-case';
import type { BuildItemClaimProjectionsUseCase } from './build-item-claim-projections.use-case';

export interface ItemUseCases {
  addItem: AddItemUseCase;
  listItems: ListItemsUseCase;
  claimItem: ClaimItemUseCase;
  claimItemWithLinked: ClaimItemWithLinkedUseCase;
  addItemLink: AddItemLinkUseCase;
  deleteItem: DeleteItemUseCase;
  updateItem: UpdateItemUseCase;
  getFieldDefinitions: GetFieldDefinitionsUseCase;
  unclaimItem: UnclaimItemUseCase;
  validateItemAudience: ValidateItemAudienceUseCase;
  extractMetadata: ExtractMetadataUseCase;
  getItemReviews: GetItemReviewsUseCase;
  summarizeItemDescription: SummarizeItemDescriptionUseCase;
  parseImportPreview: ParseImportPreviewUseCase;
  bulkAddItems: BulkAddItemsUseCase;
  syncItemLinks: SyncItemLinksUseCase;
  buildItemClaimProjections: BuildItemClaimProjectionsUseCase;
}
