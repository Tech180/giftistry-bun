import type { AddItemUseCase } from '../application/add-item.use-case';
import type { ListItemsUseCase } from '../application/list-items.use-case';
import type { ClaimItemUseCase } from '../application/claim-item.use-case';
import type { AddItemLinkUseCase } from '../application/add-item-link.use-case';
import type { DeleteItemUseCase } from '../application/delete-item.use-case';
import type { UpdateItemUseCase } from '../application/update-item.use-case';
import type { GetFieldDefinitionsUseCase } from '../application/get-field-definitions.use-case';
import type { UnclaimItemUseCase } from '../application/unclaim-item.use-case';
import type { ValidateItemAudienceUseCase } from '../application/validate-item-audience.use-case';
import type { ExtractMetadataUseCase } from '../application/extract-metadata.use-case';
import type { GetItemReviewsUseCase } from '../application/get-item-reviews.use-case';
import type { SummarizeItemDescriptionUseCase } from '../application/summarize-item-description.use-case';

export interface ItemUseCases {
  addItem: AddItemUseCase;
  listItems: ListItemsUseCase;
  claimItem: ClaimItemUseCase;
  addItemLink: AddItemLinkUseCase;
  deleteItem: DeleteItemUseCase;
  updateItem: UpdateItemUseCase;
  getFieldDefinitions: GetFieldDefinitionsUseCase;
  unclaimItem: UnclaimItemUseCase;
  validateItemAudience: ValidateItemAudienceUseCase;
  extractMetadata: ExtractMetadataUseCase;
  getItemReviews: GetItemReviewsUseCase;
  summarizeItemDescription: SummarizeItemDescriptionUseCase;
}
