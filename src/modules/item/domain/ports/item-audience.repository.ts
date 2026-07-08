import type { ItemAudienceUser } from '../item-audience.entity';

export interface ItemAudienceRepository {
  findByListId(listId: string): Promise<Map<string, ItemAudienceUser[]>>;
  findByItemId(itemId: string): Promise<ItemAudienceUser[]>;
  setAudience(itemId: string, userIds: string[]): Promise<ItemAudienceUser[]>;
  deleteByItemId(itemId: string): Promise<void>;
  deleteByListIdAndUserId(listId: string, userId: string): Promise<void>;
}
