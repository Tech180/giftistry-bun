import type { ListAccessInfo } from '../interfaces/list-access-info.interface';

export interface ListAccessRepository {
  findAccessInfo(listId: string): Promise<ListAccessInfo | null>;
  /**
   * Resolve wishlist id from an `items.id`, or from an `item_substitutions.id`
   * join-row (used by PUT/DELETE `/items/:itemId/substitution`).
   */
  findListIdByItemId(itemId: string): Promise<string | null>;
}
