import type { ListItemGroupDto } from './list-item-group-dto.interface';

export interface ListItemsResult {
  Items: Record<string, unknown>[];
  Groups: ListItemGroupDto[];
}
