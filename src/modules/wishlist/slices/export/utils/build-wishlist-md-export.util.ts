import { GIFTISTRY_MD_META_KEYS } from '@/modules/item';
import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import { buildGiftistryExportItemFields } from './build-giftistry-export-item-fields.util';
import { getExportFilename } from './export-filename.util';

function bullet(label: string, value: string): string {
  return `- ${label}: ${value}`;
}

export function buildWishlistMdExport(params: {
  wishlistTitle: string;
  items: WishlistExportItem[];
  exportContext: WishlistExportContext;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
}): WishlistExportResult {
  const { wishlistTitle, items, exportContext, relationItems, relationNameById } = params;
  const blocks: string[] = [`# Wishlist: ${wishlistTitle}`, ''];

  items.forEach((item, index) => {
    const fields = buildGiftistryExportItemFields({
      item,
      relationItems,
      relationNameById,
      exportContext,
    });
    const link = fields.links[0];
    blocks.push(`# ${fields.name}`, '');
    blocks.push(bullet(GIFTISTRY_MD_META_KEYS.category, fields.category));
    if (fields.priorityLabel) {
      blocks.push(bullet(GIFTISTRY_MD_META_KEYS.priority, fields.priorityLabel));
    }
    blocks.push(bullet(GIFTISTRY_MD_META_KEYS.favorite, fields.isFavorite ? 'yes' : 'no'));
    if (link?.priceLabel) {
      blocks.push(bullet(GIFTISTRY_MD_META_KEYS.price, link.priceLabel.replace(/^\$/, '')));
    }
    if (link?.url) {
      blocks.push(bullet(GIFTISTRY_MD_META_KEYS.link, link.url));
    }
    if (link?.retailer) {
      blocks.push(bullet(GIFTISTRY_MD_META_KEYS.retailer, link.retailer));
    }
    blocks.push(bullet(GIFTISTRY_MD_META_KEYS.audience, fields.audience));
    blocks.push(bullet(GIFTISTRY_MD_META_KEYS.suggestion, fields.suggestion));
    blocks.push(bullet(GIFTISTRY_MD_META_KEYS.linkedItems, fields.linkedItems));
    blocks.push(bullet(GIFTISTRY_MD_META_KEYS.relatedItems, fields.relatedItems));
    blocks.push('');
    if (fields.description) {
      blocks.push(fields.description, '');
    }
    if (fields.customFields.length > 0) {
      blocks.push('## Custom fields');
      for (const field of fields.customFields) {
        blocks.push(`- ${field.key}: ${field.value}`);
      }
      blocks.push('');
    }
    if (index < items.length - 1) {
      blocks.push('---', '');
    }
  });

  return {
    filename: getExportFilename(wishlistTitle, exportContext.exporterName, 'md'),
    contentType: 'text/markdown;charset=utf-8;',
    data: blocks.join('\n'),
  };
}
