import type { ListShare, ListRole } from '../list-share.entity';

export interface ListShareRepository {
  addShare(listId: string, userId: string, role: 'viewer' | 'collaborator'): Promise<ListShare>;
  getRole(listId: string, userId: string): Promise<ListRole | null>;
  findListIdByItemId(itemId: string): Promise<string | null>;
}
