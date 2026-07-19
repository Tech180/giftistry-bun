import type { Item } from './item.entity';
import type { ItemDescriptionMetadata } from './item-description.util';
import { parseItemDescription } from './item-description.util';

/** Build API Metadata from first-class columns, falling back to Description JSON for legacy rows. */
export function resolveItemMetadata(item: Item): ItemDescriptionMetadata | null {
  const fromDescription = parseItemDescription(item.Description);
  const hasColumns =
    item.IsFavorite === true ||
    item.IsPinned === true ||
    item.MultiCount === true ||
    item.DesiredQuantity != null ||
    item.OtherUsersCanSee != null ||
    (item.CustomFields != null &&
      (Object.keys(item.CustomFields.Predefined ?? {}).length > 0 ||
        Object.keys(item.CustomFields.UserDefined ?? {}).length > 0)) ||
    (item.Variations != null && item.Variations.length > 0) ||
    (item.LinkedItemIds != null && item.LinkedItemIds.length > 0);

  if (!hasColumns && !fromDescription.metadata) {
    return fromDescription.isJson ? fromDescription.metadata : null;
  }

  const legacy = fromDescription.metadata;
  const text =
    fromDescription.isJson
      ? fromDescription.text
      : item.Description?.trim() || null;

  const metadata: ItemDescriptionMetadata = {
    Text: text,
    CustomFields: {
      Predefined: item.CustomFields?.Predefined ?? legacy?.CustomFields?.Predefined ?? {},
      UserDefined: item.CustomFields?.UserDefined ?? legacy?.CustomFields?.UserDefined ?? {},
    },
  };

  const isFavorite = item.IsFavorite === true || legacy?.IsFavorite === true;
  const isPinned = item.IsPinned === true || legacy?.IsPinned === true;
  if (isFavorite) metadata.IsFavorite = true;
  if (isPinned) metadata.IsPinned = true;

  const multiCount = item.MultiCount === true || legacy?.MultiCount === true;
  if (multiCount) metadata.MultiCount = true;

  const desired =
    item.DesiredQuantity !== undefined && item.DesiredQuantity !== null
      ? item.DesiredQuantity
      : legacy?.DesiredQuantity;
  if (desired !== undefined) metadata.DesiredQuantity = desired;

  const variations =
    item.Variations && item.Variations.length > 0
      ? item.Variations
      : legacy?.Variations;
  if (variations?.length) metadata.Variations = variations;

  const otherUsersCanSee =
    item.OtherUsersCanSee !== undefined && item.OtherUsersCanSee !== null
      ? item.OtherUsersCanSee
      : legacy?.OtherUsersCanSee;
  if (otherUsersCanSee !== undefined) metadata.OtherUsersCanSee = otherUsersCanSee;

  const linked =
    item.LinkedItemIds && item.LinkedItemIds.length > 0
      ? item.LinkedItemIds
      : legacy?.LinkedItemIds;
  if (linked?.length) metadata.LinkedItemIds = linked;

  return metadata;
}

/** Plain text for the description column when Metadata is provided. */
export function resolvePlainDescriptionText(
  description: string | null | undefined,
  metadata: ItemDescriptionMetadata | null | undefined
): string | null {
  if (metadata) {
    const text = (metadata.Text ?? description ?? '').toString().trim();
    return text || null;
  }
  if (!description) return null;
  const parsed = parseItemDescription(description);
  if (parsed.isJson) {
    return parsed.text;
  }
  return description;
}
