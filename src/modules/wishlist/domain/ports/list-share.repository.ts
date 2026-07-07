import type { GrantedVia, ListShare, ListShareWithUser, ListRole, ShareRole } from '../list-share.entity';

export interface ListShareRepository {
  addShare(listId: string, userId: string, role: ShareRole, grantedVia?: GrantedVia): Promise<ListShare>;
  getRole(listId: string, userId: string): Promise<ListRole | null>;
  findListIdByItemId(itemId: string): Promise<string | null>;
  findSharesByListId(listId: string): Promise<ListShare[]>;
  findShareById(shareId: string): Promise<ListShare | null>;
  findSharesWithUsers(listId: string): Promise<ListShareWithUser[]>;
  updateShareRole(shareId: string, role: ShareRole): Promise<ListShare>;
  removeShare(shareId: string): Promise<void>;
}
