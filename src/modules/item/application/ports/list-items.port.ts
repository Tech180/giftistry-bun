import type { ListItemsResult } from '../../slices/catalog/interfaces/list-items-result.interface';

/** Published contract: list items for a wishlist viewer. */
export interface ListItemsPort {
  execute(listId: string, currentUserId: string | null): Promise<ListItemsResult>;
}
