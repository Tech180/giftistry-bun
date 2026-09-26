import type { GrantedVia } from '../types/granted-via.type';
import type { ListShare } from '../interfaces/list-share.interface';
import type { ListShareWithUser } from '../interfaces/list-share-with-user.interface';
import type { ListRole } from '../types/list-role.type';
import type { ShareRole } from '../types/share-role.type';

export interface ListShareRepository {
  addShare(listId: string, userId: string, role: ShareRole, grantedVia?: GrantedVia): Promise<ListShare>;
  getRole(listId: string, userId: string): Promise<ListRole | null>;
  /** Same resolution as ListAccessRepository.findListIdByItemId (item or substitution join id). */
  findListIdByItemId(itemId: string): Promise<string | null>;
  findSharesByListId(listId: string): Promise<ListShare[]>;
  findShareById(shareId: string): Promise<ListShare | null>;
  findSharesWithUsers(listId: string): Promise<ListShareWithUser[]>;
  updateShareRole(shareId: string, role: ShareRole): Promise<ListShare>;
  removeShare(shareId: string): Promise<void>;
}
