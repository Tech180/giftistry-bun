import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { buildGiftistryExportItemFields } from './build-giftistry-export-item-fields.util';
import { getExportFilename } from './export-filename.util';

export function buildWishlistJsonExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
}): WishlistExportResult {
  const { wishlistTitle, items, exportContext, relationItems, relationNameById } = params;

  const formattedItems = items.map((item) => {
    const fields = buildGiftistryExportItemFields({
      item,
      relationItems,
      relationNameById,
      exportContext,
    });
    return {
      name: fields.name,
      category: fields.category,
      priority: fields.priority,
      isFavorite: fields.isFavorite,
      description: fields.description,
      audience: fields.audience,
      suggestion: fields.suggestion,
      linkedItems: fields.linkedPeerNames,
      relatedItems: fields.relatedPeerNames,
      links: fields.links.map((link) => ({
        url: link.url,
        retailer: link.retailer,
        price: link.price,
      })),
    };
  });

  const data = {
    wishlistTitle,
    exportedAt: new Date().toISOString(),
    items: formattedItems,
  };

  return {
    filename: getExportFilename(wishlistTitle, exportContext.exporterName, 'json'),
    contentType: 'application/json;charset=utf-8;',
    data: JSON.stringify(data, null, 2),
  };
}
