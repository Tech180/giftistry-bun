import { GIFTISTRY_TXT_LABELS } from '@/modules/item';
import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { buildGiftistryExportItemFields } from './build-giftistry-export-item-fields.util';
import { getExportFilename } from './export-filename.util';
import { groupExportItemsByCategory } from './group-export-items-by-category.util';

function labeled(label: string, value: string): string {
  return `    ${label}: ${value}`;
}

export function buildWishlistTxtExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
}): WishlistExportResult {
  const { wishlistTitle, items, exportContext, relationItems, relationNameById } = params;
  const sections: string[] = [];
  sections.push('============================================================');
  sections.push(`WISHLIST REGISTRY: ${wishlistTitle.toUpperCase()}`);
  sections.push('============================================================');
  sections.push('');

  const { categories, categoryGroups } = groupExportItemsByCategory(items);

  for (const cat of categories) {
    sections.push(`[${cat.toUpperCase()}]`);
    sections.push('-'.repeat(cat.length + 2));

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
      const starPrefix = fields.isFavorite ? '★ ' : '  ';
      const priorityLabel = fields.priority === null ? '' : `(Priority: ${fields.priority})`;
      const links = fields.links.length > 0 ? fields.links : [null];

      for (const link of links) {
        const priceStr = link?.priceLabel ? ` - ${link.priceLabel}` : '';
        sections.push(`${starPrefix}${fields.name}${priceStr} ${priorityLabel}`.trimEnd());
        if (link?.url) {
          sections.push(`    Link: ${link.retailer || 'Store'} (${link.url})`);
        }
        sections.push(labeled(GIFTISTRY_TXT_LABELS.description, fields.description));
        sections.push(labeled(GIFTISTRY_TXT_LABELS.audience, fields.audience));
        sections.push(labeled(GIFTISTRY_TXT_LABELS.suggestion, fields.suggestion));
        sections.push(labeled(GIFTISTRY_TXT_LABELS.linkedItems, fields.linkedItems));
        sections.push(labeled(GIFTISTRY_TXT_LABELS.relatedItems, fields.relatedItems));
      }
      sections.push('');
    }
    sections.push('');
  }

  return {
    filename: getExportFilename(wishlistTitle, exportContext.exporterName, 'txt'),
    contentType: 'text/plain;charset=utf-8;',
    data: sections.join('\n'),
  };
}
