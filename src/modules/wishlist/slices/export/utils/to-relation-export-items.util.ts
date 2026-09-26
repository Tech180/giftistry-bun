import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';

export function toRelationExportItems(items: WishlistExportItem[]): RelationExportItem[] {
  return items.map((item) => ({
    Id: item.Id,
    Name: item.Name,
    Description: item.Description,
    Metadata: item.Metadata
      ? {
          LinkedItemIds: item.Metadata.LinkedItemIds,
          RelatedItemIds: item.Metadata.RelatedItemIds,
        }
      : null,
  }));
}
