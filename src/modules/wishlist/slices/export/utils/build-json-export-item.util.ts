import type { GiftistryExportItemFields } from '../interfaces/giftistry-export-item-fields.interface';
import { isPopulatedExportString } from './is-populated-export-string.util';
import { omitEmptyExportValues } from './omit-empty-export-values.util';

export function buildJsonExportItem(fields: GiftistryExportItemFields): Record<string, unknown> {
  const links = fields.links
    .filter((link) => isPopulatedExportString(link.url))
    .map((link) =>
      omitEmptyExportValues({
        url: link.url,
        retailer: link.retailer,
        price: link.price,
      })
    );

  const raw: Record<string, unknown> = {
    name: fields.name,
    category: fields.category,
    priority: fields.priority,
    isFavorite: fields.isFavorite,
    description: fields.description,
    suggestion: fields.suggestion,
    linkedItems: fields.linkedPeerNames,
    relatedItems: fields.relatedPeerNames,
    links,
  };

  return omitEmptyExportValues(raw);
}
