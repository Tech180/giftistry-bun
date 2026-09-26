import type { Item } from './item.interface';
import type { Wishlist } from '@/modules/wishlist';
import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';

export interface ItemVisibilityContext {
  item: Item;
  wishlist: Wishlist;
  currentUserId: string | null;
  audienceUserIds: string[];
  /** When set, collaborators can mutate any visible item like the owner. */
  listRole?: ListRoleLevel | null;
}
