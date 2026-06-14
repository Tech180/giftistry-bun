import type { AddItemUseCase } from '../application/add-item.use-case';
import type { ListItemsUseCase } from '../application/list-items.use-case';
import type { ClaimItemUseCase } from '../application/claim-item.use-case';
import type { AddItemLinkUseCase } from '../application/add-item-link.use-case';

export interface ItemUseCases {
  addItem: AddItemUseCase;
  listItems: ListItemsUseCase;
  claimItem: ClaimItemUseCase;
  addItemLink: AddItemLinkUseCase;
}
