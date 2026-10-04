import { GIFTISTRY_TABULAR_HEADERS } from '@/modules/item';
import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import {
  buildGiftistryExportItemFields,
  giftistryCategorySectionRow,
  giftistryExportItemToTabularCells,
} from './build-giftistry-export-item-fields.util';
import { escapeCsvValue } from './escape-csv-value.util';
import { getExportFilename } from './export-filename.util';
import { groupExportItemsByCategory } from './group-export-items-by-category.util';

export function buildWishlistCsvExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
}): WishlistExportResult {
  const { wishlistTitle, items, exportContext, relationItems, relationNameById } = params;
  const headers = [...GIFTISTRY_TABULAR_HEADERS];
  const rows: string[][] = [];
  const emptyRow = headers.map(() => '');
  const { categories, categoryGroups } = groupExportItemsByCategory(items);

  for (const cat of categories) {
    rows.push(giftistryCategorySectionRow(cat));
    const catItems = categoryGroups[cat];
    if (!catItems) {
      continue;
    }
    for (const item of catItems) {
      const fields = buildGiftistryExportItemFields({
        item,
        relationItems,
        relationNameById,
        exportContext,
      });
      if (fields.links.length > 0) {
        for (const link of fields.links) {
          rows.push(giftistryExportItemToTabularCells(fields, link));
        }
      } else {
        rows.push(giftistryExportItemToTabularCells(fields, null));
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
