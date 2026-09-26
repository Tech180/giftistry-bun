import type { Item } from '../../../domain/interfaces/item.interface';

export interface BulkAddItemsResult {
  created: number;
  items: Item[];
  failed: Array<{ index: number; message: string }>;
}
