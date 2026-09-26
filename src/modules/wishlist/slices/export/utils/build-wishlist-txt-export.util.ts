import type { RelationExportItem } from '@/modules/item';
import { parseItemDescription } from '@/modules/item';
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
import { groupExportItemsByCategory } from './group-export-items-by-category.util';

export function buildWishlistTxtExport(params: {
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
  } = params;

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
      const starPrefix = item.isFav ? '★ ' : '  ';
      const priorityLabel = item.Priority !== null && item.Priority !== undefined ? `(Priority: ${item.Priority})` : '';
      const parsed = parseItemDescription(item.Description);
      const descText = parsed.text || '';
      const descStr = descText ? `\n    Description: ${descText}` : '';
      const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
      const suggestion = formatSuggestionForExport(item, exportContext.isOwner);
      const linkedItems = formatLinkedItemsForExport(item.Id, relationItems, relationNameById);
      const relatedItems = formatRelatedItemsForExport(item.Id, relationItems, relationNameById);
      const metaStr = `\n    Audience: ${audience}${suggestion ? `\n    Suggestion: ${suggestion}` : ''}${
        linkedItems ? `\n    Linked Items: ${linkedItems}` : ''
      }${relatedItems ? `\n    Related Items: ${relatedItems}` : ''}`;

      if (item.Links && item.Links.length > 0) {
        for (const link of item.Links) {
          const priceStr = link.ExtractedPrice !== null && link.ExtractedPrice !== undefined
            ? ` - $${link.ExtractedPrice.toFixed(2)}`
            : '';
          const retailer = link.RetailerName || 'Store';
          sections.push(`${starPrefix}${item.Name}${priceStr} ${priorityLabel}`);
          if (link.Url) {
            sections.push(`    Link: ${retailer} (${link.Url})`);
          }
          if (descStr) {
            sections.push(descStr);
          }
          sections.push(metaStr);
        }
      } else {
        sections.push(`${starPrefix}${item.Name} ${priorityLabel}`);
        if (descStr) {
          sections.push(descStr);
        }
        sections.push(metaStr);
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
