import type { RelationExportItem } from '@/modules/item';
import { parseItemDescription } from '@/modules/item';
import ExcelJS from 'exceljs';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { getExportFilename } from './export-filename.util';
import { formatAudienceForExport } from './format-audience-for-export.util';
import {
  formatLinkedItemsForExport,
  formatRelatedItemsForExport,
} from './format-relation-items-for-export.util';
import { formatSuggestionForExport } from './format-suggestion-for-export.util';
import { getSiteName } from './get-site-name.util';
import { groupExportItemsByCategory } from './group-export-items-by-category.util';

export async function buildWishlistXlsxExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
  includeSuggestionColumn: boolean;
}): Promise<WishlistExportResult> {
  const {
    wishlistTitle,
    items,
    exportContext,
    relationItems,
    relationNameById,
    includeSuggestionColumn,
  } = params;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Wishlist');

  worksheet.getColumn(1).width = 18;
  worksheet.getColumn(2).width = 12;
  worksheet.getColumn(3).width = 28;
  worksheet.getColumn(4).width = 8;
  worksheet.getColumn(5).width = 12;
  worksheet.getColumn(6).width = 18;
  worksheet.getColumn(7).width = 45;
  worksheet.getColumn(8).width = 18;
  let nextCol = 9;
  if (includeSuggestionColumn) {
    worksheet.getColumn(nextCol).width = 22;
    nextCol += 1;
  }
  worksheet.getColumn(nextCol).width = 28;
  worksheet.getColumn(nextCol + 1).width = 28;

  const headers = [
    'Category',
    'Priority',
    'Item',
    'Star',
    'Price',
    'Website',
    'Description',
    'Audience',
    ...(includeSuggestionColumn ? ['Suggestion'] : []),
    'Linked Items',
    'Related Items',
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Inter',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5E6AD2' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true
    };
  });

  const { categories, categoryGroups } = groupExportItemsByCategory(items);

  for (const cat of categories) {
    if (worksheet.rowCount > 1) {
      worksheet.addRow([]);
    }

    const catRow = worksheet.addRow([`${cat}:`]);
    catRow.height = 22;
    const catCell = catRow.getCell(1);
    catCell.font = {
      name: 'Inter',
      size: 13,
      bold: true,
      color: { argb: 'FF111111' }
    };
    catCell.alignment = { vertical: 'middle', wrapText: true };

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

      let priceVal = '';
      let websiteLabel = '';
      let linkUrl = '';

      const link = item.Links?.[0];
      if (link) {
        priceVal =
          link.ExtractedPrice != null ? `$${link.ExtractedPrice.toFixed(2)}` : '';
        websiteLabel = link.RetailerName || (link.Url ? getSiteName(link.Url) : 'Store');
        linkUrl = link.Url || '';
      }

      const rowValues = [
        '',
        priorityVal,
        item.Name,
        starVal,
        priceVal,
        websiteLabel,
        formattedDesc,
        audience,
        ...(includeSuggestionColumn ? [suggestion] : []),
        linkedItems,
        relatedItems,
      ];
      const itemRow = worksheet.addRow(rowValues);

      itemRow.eachCell((cell, colNumber) => {
        if (colNumber === 6 && linkUrl) {
          cell.value = { text: websiteLabel, hyperlink: linkUrl };
          cell.font = {
            name: 'Inter',
            size: 10,
            color: { argb: 'FF0055FF' },
            underline: true
          };
        } else {
          cell.font = {
            name: 'Inter',
            size: 10,
            color: { argb: 'FF333333' }
          };
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true
        };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: getExportFilename(wishlistTitle, exportContext.exporterName, 'xlsx'),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    data: new Uint8Array(buffer),
  };
}
