import {
  GIFTISTRY_TABULAR_HEADERS,
  getLinkedItemIdsFromExportItem,
  getRelatedItemIdsFromExportItem,
  parseItemDescription,
  resolveRelationPeerNames,
} from '@/modules/item';
import type { RelationExportItem } from '@/modules/item';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportLink } from '../interfaces/wishlist-export-link.interface';
import { formatAudienceForExport } from './format-audience-for-export.util';
import { formatSuggestionForExport } from './format-suggestion-for-export.util';
import { getSiteName } from './get-site-name.util';
import type { GiftistryExportItemFields } from '../interfaces/giftistry-export-item-fields.interface';
import type { GiftistryExportLinkFields } from '../interfaces/giftistry-export-link-fields.interface';

function formatPrice(price: number | null | undefined): { label: string; value: number | null } {
  if (price === null || price === undefined || !Number.isFinite(Number(price))) {
    return { label: '', value: null };
  }
  const value = Number(price);
  return { label: `$${value.toFixed(2)}`, value };
}

function linkFields(link: WishlistExportLink): GiftistryExportLinkFields {
  const url = link.Url?.trim() || '';
  const price = formatPrice(link.ExtractedPrice);
  return {
    url,
    retailer: link.RetailerName?.trim() || (url ? getSiteName(url) : ''),
    priceLabel: price.label,
    price: price.value,
  };
}

export function buildGiftistryExportItemFields(params: {
  item: WishlistExportItem;
  relationItems: RelationExportItem[];
  relationNameById: Map<string, string>;
  exportContext: WishlistExportContext;
}): GiftistryExportItemFields {
  const { item, relationItems, relationNameById, exportContext } = params;
  const parsed = parseItemDescription(item.Description);
  const linkedPeerNames = resolveRelationPeerNames(
    item.Id,
    relationItems,
    relationNameById,
    getLinkedItemIdsFromExportItem
  );
  const relatedPeerNames = resolveRelationPeerNames(
    item.Id,
    relationItems,
    relationNameById,
    getRelatedItemIdsFromExportItem
  );
  const customFields: Array<{ key: string; value: string }> = [];
  const predefined = parsed.metadata?.CustomFields?.Predefined ?? {};
  const userDefined = parsed.metadata?.CustomFields?.UserDefined ?? {};
  for (const [key, value] of Object.entries(predefined)) {
    if (value?.trim()) {
      customFields.push({ key, value: value.trim() });
    }
  }
  for (const [key, value] of Object.entries(userDefined)) {
    if (value?.trim()) {
      customFields.push({ key, value: value.trim() });
    }
  }

  const priority =
    item.Priority !== null && item.Priority !== undefined && Number.isFinite(Number(item.Priority))
      ? Number(item.Priority)
      : null;

  return {
    name: item.Name,
    category: item.categoryFormatted || item.Category || '',
    priorityLabel: priority === null ? '' : String(priority),
    priority,
    star: item.isFav ? '*' : '',
    isFavorite: item.isFav === true,
    description: parsed.text || '',
    audience: formatAudienceForExport(
      item.SharedWith,
      exportContext.currentUserId,
      item.SuggestedByUserId
    ),
    suggestion: formatSuggestionForExport(item, exportContext.isOwner),
    linkedItems: linkedPeerNames.join(', '),
    relatedItems: relatedPeerNames.join(', '),
    linkedPeerNames,
    relatedPeerNames,
    links: (item.Links || []).map(linkFields),
    customFields,
  };
}

export function giftistryExportItemToTabularCells(
  fields: GiftistryExportItemFields,
  link: GiftistryExportLinkFields | null
): string[] {
  return [
    '',
    fields.priorityLabel,
    fields.name,
    fields.star,
    link?.priceLabel || '',
    link?.url || '',
    fields.description,
    fields.audience,
    fields.suggestion,
    fields.linkedItems,
    fields.relatedItems,
  ];
}

export function giftistryCategorySectionRow(category: string): string[] {
  return [`${category}:`, ...GIFTISTRY_TABULAR_HEADERS.slice(1).map(() => '')];
}
