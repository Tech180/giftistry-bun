import type { ImportedItemPreview } from '../interfaces/imported-item-preview.interface';
import type { ItemDescriptionMetadata } from '../interfaces/item-description-metadata.interface';
import { classifyImportedCustomFields } from './classify-imported-custom-fields.util';
import { resolveDesiredQuantity } from './parse-pack-quantity.util';
import type { ImportBulkItemPayload } from '../interfaces/import-bulk-item-payload.interface';

/**
 * Builds plain description + first-class metadata for wishlist import creates.
 * Favorite, quantity, and custom fields go on metadata columns when present.
 */
export function buildImportedItemCreatePayload(item: ImportedItemPreview): ImportBulkItemPayload {
  const text = item.description?.trim() || null;
  const qty =
    resolveDesiredQuantity(item.desiredQuantity, item.name, item.description) ?? null;

  const classified = classifyImportedCustomFields(
    [],
    {
      title: item.name,
      category: item.category,
      url: item.websiteLink,
    },
    { color: item.color, size: item.size }
  );

  const fromPreview = item.customFields;
  const predefined = {
    ...classified.Predefined,
    ...(fromPreview?.Predefined ?? {}),
  };
  const userDefined = {
    ...classified.UserDefined,
    ...(fromPreview?.UserDefined ?? {}),
  };

  const hasCustom =
    Object.keys(predefined).length > 0 || Object.keys(userDefined).length > 0;
  const isFavorite = item.isFavorite === true;
  const hasQty = qty != null && qty > 1;

  if (!isFavorite && !hasQty && !hasCustom) {
    return { description: text, metadata: null };
  }

  const metadata: ItemDescriptionMetadata = {
    Text: text,
    CustomFields: hasCustom
      ? { Predefined: predefined, UserDefined: userDefined }
      : { Predefined: {}, UserDefined: {} },
  };
  if (isFavorite) metadata.IsFavorite = true;
  if (hasQty) {
    metadata.DesiredQuantity = qty;
    metadata.MultiCount = true;
  }

  return { description: text, metadata };
}

export function mapImportedPreviewToBulkFields(item: ImportedItemPreview): {
  name: string;
  description: string | null;
  linkUrl: string | null;
  price: number | null;
  category: string | null;
  priority: number | null;
  metadata: ItemDescriptionMetadata | null;
} {
  const payload = buildImportedItemCreatePayload(item);
  return {
    name: item.name.trim(),
    description: payload.description,
    linkUrl: item.websiteLink?.trim() || null,
    price: item.price ?? null,
    category: item.category?.trim() || null,
    priority: item.priority ?? null,
    metadata: payload.metadata,
  };
}
