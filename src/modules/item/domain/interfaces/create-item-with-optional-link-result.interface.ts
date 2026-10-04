import type { Item } from './item.interface';
import type { ItemLink } from './item-link.interface';

export interface CreateItemWithOptionalLinkResult {
  item: Item;
  link: ItemLink | null;
}
