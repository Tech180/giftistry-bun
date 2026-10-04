import { GIFTISTRY_TXT_LABELS } from '@/modules/item';
import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { appendTxtLabeledLine } from './append-txt-labeled-line.util';
import { buildGiftistryExportItemFields } from './build-giftistry-export-item-fields.util';
import { getExportFilename } from './export-filename.util';
import { groupExportItemsByCategory } from './group-export-items-by-category.util';
import { isPopulatedExportString } from './is-populated-export-string.util';

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
      const prioritySuffix =
        fields.priority === null ? '' : `(Priority: ${fields.priority})`;
      const linksWithUrl = fields.links.filter((link) => isPopulatedExportString(link.url));
      const links = linksWithUrl.length > 0 ? linksWithUrl : [null];

      for (const link of links) {
        const priceStr = link?.priceLabel ? ` - ${link.priceLabel}` : '';
        const titleLine = `${starPrefix}${fields.name}${priceStr}${prioritySuffix ? ` ${prioritySuffix}` : ''}`.trimEnd();
        sections.push(titleLine);
        if (link?.url) {
          sections.push(`    Link: ${link.retailer || 'Store'} (${link.url})`);
        }
        appendTxtLabeledLine(sections, GIFTISTRY_TXT_LABELS.description, fields.description);
        appendTxtLabeledLine(sections, GIFTISTRY_TXT_LABELS.suggestion, fields.suggestion);
        appendTxtLabeledLine(sections, GIFTISTRY_TXT_LABELS.linkedItems, fields.linkedItems);
        appendTxtLabeledLine(sections, GIFTISTRY_TXT_LABELS.relatedItems, fields.relatedItems);
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
