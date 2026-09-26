import type { RelationExportItem } from '@/modules/item';
import { parseItemDescription } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { escapeCsvValue } from './escape-csv-value.util';
import { getExportFilename } from './export-filename.util';
import { formatAudienceForExport } from './format-audience-for-export.util';
import {
  formatLinkedItemsForExport,
  formatRelatedItemsForExport,
} from './format-relation-items-for-export.util';
import { formatSuggestionForExport } from './format-suggestion-for-export.util';
import { groupExportItemsByCategory } from './group-export-items-by-category.util';

export function buildWishlistCsvExport(params: {
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

  const headers = [
    'Category',
    'Priority',
    'Item',
    'Star',
    'Price',
    'Website Link',
    'Description',
    'Audience',
    ...(includeSuggestionColumn ? ['Suggestion'] : []),
    'Linked Items',
    'Related Items',
  ];
  const rows: unknown[][] = [];
  const emptyRow = headers.map(() => '');
  const { categories, categoryGroups } = groupExportItemsByCategory(items);

  for (const cat of categories) {
    rows.push([`${cat}:`, ...headers.slice(1).map(() => '')]);

    const catItems = categoryGroups[cat];
    if (!catItems) {
      continue;
    }
    for (const item of catItems) {
      const priorityVal = item.Priority !== null && item.Priority !== undefined ? item.Priority : '';
      const starVal = item.isFav ? '*' : '';
      const parsed = parseItemDescription(item.Description);
      const formattedDesc = parsed.text || '';
      const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
      const suggestion = includeSuggestionColumn
        ? formatSuggestionForExport(item, exportContext.isOwner)
        : null;
      const linkedItems = formatLinkedItemsForExport(item.Id, relationItems, relationNameById);
      const relatedItems = formatRelatedItemsForExport(item.Id, relationItems, relationNameById);

      const appendMeta = (row: unknown[]) => {
        const withSuggestion = includeSuggestionColumn ? [...row, suggestion] : row;
        return [...withSuggestion, linkedItems, relatedItems];
      };

      if (item.Links && item.Links.length > 0) {
        for (const link of item.Links) {
          const priceVal = link.ExtractedPrice !== null && link.ExtractedPrice !== undefined
            ? `$${link.ExtractedPrice.toFixed(2)}`
            : '';
          rows.push(appendMeta([
            '',
            priorityVal,
            item.Name,
            starVal,
            priceVal,
            link.Url || '',
            formattedDesc,
            audience,
          ]));
        }
      } else {
        rows.push(appendMeta([
          '',
          priorityVal,
          item.Name,
          starVal,
          '',
          '',
          formattedDesc,
          audience,
        ]));
      }
    }
    rows.push(emptyRow);
  }

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\r\n');

  return {
    filename: getExportFilename(wishlistTitle, exportContext.exporterName, 'csv'),
    contentType: 'text/csv;charset=utf-8;',
    data: csvContent,
  };
}
