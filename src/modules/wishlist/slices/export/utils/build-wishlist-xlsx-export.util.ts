import { GIFTISTRY_TABULAR_HEADERS } from '@/modules/item';
import type { RelationExportItem } from '@/modules/item';
import ExcelJS from 'exceljs';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import {
  buildGiftistryExportItemFields,
  giftistryExportItemToTabularCells,
} from './build-giftistry-export-item-fields.util';
import { getExportFilename } from './export-filename.util';
import { groupExportItemsByCategory } from './group-export-items-by-category.util';

export async function buildWishlistXlsxExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
}): Promise<WishlistExportResult> {
  const { wishlistTitle, items, exportContext, relationItems, relationNameById } = params;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Wishlist');
  const widths = [18, 12, 28, 8, 12, 28, 45, 18, 22, 28, 28];
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  const headers = [...GIFTISTRY_TABULAR_HEADERS];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Inter',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF5E6AD2' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true,
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
      color: { argb: 'FF111111' },
    };
    catCell.alignment = { vertical: 'middle', wrapText: true };

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
      const link = fields.links[0] ?? null;
      const rowValues = giftistryExportItemToTabularCells(fields, link);
      if (link?.retailer) {
        rowValues[5] = link.retailer;
      }
      const itemRow = worksheet.addRow(rowValues);

      itemRow.eachCell((cell, colNumber) => {
        if (colNumber === 6 && link?.url) {
          cell.value = { text: link.retailer || link.url, hyperlink: link.url };
          cell.font = {
            name: 'Inter',
            size: 10,
            color: { argb: 'FF0055FF' },
            underline: true,
          };
        } else {
          cell.font = {
            name: 'Inter',
            size: 10,
            color: { argb: 'FF333333' },
          };
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
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
