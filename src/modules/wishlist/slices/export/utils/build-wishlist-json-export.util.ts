import type { RelationExportItem } from '@/modules/item';
import {
  getLinkedItemIdsFromExportItem,
  getRelatedItemIdsFromExportItem,
  parseItemDescription,
  resolveRelationPeerNames,
} from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { getExportFilename } from './export-filename.util';
import { formatAudienceForExport } from './format-audience-for-export.util';
import { formatSuggestionForExport } from './format-suggestion-for-export.util';

export function buildWishlistJsonExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
  includeSuggestionColumn: boolean;
}): WishlistExportResult {
  const {
    wishlistTitle,
    items,
    exportContext,
    relationItems,
    relationNameById,
    includeSuggestionColumn,
  } = params;

  const formattedItems = items.map((item) => {
    const parsed = parseItemDescription(item.Description);
    const parsedDesc = parsed.isJson && parsed.metadata ? parsed.metadata : item.Description;
    const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
    const suggestion = includeSuggestionColumn
      ? formatSuggestionForExport(item, exportContext.isOwner)
      : '';
    const linkedItems = resolveRelationPeerNames(
      item.Id,
      relationItems,
      relationNameById,
      getLinkedItemIdsFromExportItem
    );
    const relatedItems = resolveRelationPeerNames(
      item.Id,
      relationItems,
      relationNameById,
      getRelatedItemIdsFromExportItem
    );

    return {
      name: item.Name,
      category: item.categoryFormatted,
      priority: item.Priority,
      isFavorite: item.isFav,
      description: parsedDesc,
      audience,
      ...(includeSuggestionColumn && suggestion ? { suggestion } : {}),
      ...(linkedItems.length ? { linkedItems } : {}),
      ...(relatedItems.length ? { relatedItems } : {}),
      links: (item.Links || []).map((link) => ({
        url: link.Url || '',
        retailer: link.RetailerName || '',
        price: link.ExtractedPrice
      }))
    };
  });

  const data = {
    wishlistTitle,
    exportedAt: new Date().toISOString(),
    items: formattedItems
  };

  return {
    filename: getExportFilename(wishlistTitle, exportContext.exporterName, 'json'),
    contentType: 'application/json;charset=utf-8;',
    data: JSON.stringify(data, null, 2),
  };
}
