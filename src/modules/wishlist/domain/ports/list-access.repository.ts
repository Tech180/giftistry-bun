import type { ListRoleLevel } from '@/common/domain/list-role.vo';

export interface ListAccessInfo {
  listId: string;
  ownerId: string;
  expiresAt: Date | null;
  isActive: boolean;
  ownerDisabled: boolean;
}

export interface ListAccessContext {
  listId: string;
  role: ListRoleLevel;
  isExpired: boolean;
  isActive: boolean;
}

export interface ListAccessRepository {
  findAccessInfo(listId: string): Promise<ListAccessInfo | null>;
  /**
   * Resolve wishlist id from an `items.id`, or from an `item_substitutions.id`
   * join-row (used by PUT/DELETE `/items/:itemId/substitution`).
   */
  findListIdByItemId(itemId: string): Promise<string | null>;
}
