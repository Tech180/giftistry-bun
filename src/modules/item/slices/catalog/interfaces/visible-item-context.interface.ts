import type { Item } from '../../../domain/interfaces/item.interface';
import type { Wishlist } from '@/modules/wishlist';
import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';

export interface VisibleItemContext {
  item: Item;
  wishlist: Wishlist;
  audienceUserIds: string[];
  listRole: ListRoleLevel | null;
}
