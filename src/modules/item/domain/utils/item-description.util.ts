import type { ItemPhotoWrite } from '../interfaces/item-photo-write.interface';
import type { ItemDescriptionMetadata } from '../interfaces/item-description-metadata.interface';
import type { ParsedItemDescription } from '../interfaces/parsed-item-description.interface';

export function parseItemDescription(description: string | null | undefined): ParsedItemDescription {
  if (!description?.trim()) {
    return { text: null, metadata: null, isJson: false };
  }

  const trimmed = description.trim();
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return { text: trimmed, metadata: null, isJson: false };
  }

  try {
    const parsed = JSON.parse(trimmed) as ItemDescriptionMetadata;
    if (parsed && typeof parsed === 'object') {
      return {
        text: parsed.Text || null,
        metadata: {
          Text: parsed.Text || null,
          CustomFields: {
            Predefined: parsed.CustomFields?.Predefined || {},
            UserDefined: parsed.CustomFields?.UserDefined || {},
          },
          DesiredQuantity: parsed.DesiredQuantity,
          Variations: parsed.Variations?.map(v => ({
            Name: typeof v.Name === 'string' ? v.Name.trim() : '',
            Quantity: typeof v.Quantity === 'number' ? v.Quantity : 0
          })),
          LinkedItemIds: parsed.LinkedItemIds,
          RelatedItemIds: parsed.RelatedItemIds,
          OtherUsersCanSee: parsed.OtherUsersCanSee,
          MultiCount: parsed.MultiCount,
          IsFavorite: parsed.IsFavorite === true,
          IsPinned: parsed.IsPinned === true,
        },
        isJson: true,
      };
    }
  } catch {
    // Ignore and fallback
  }

  return { text: trimmed, metadata: null, isJson: false };
}

export function serializeItemDescription(
  text: string | null | undefined,
  metadata: ItemDescriptionMetadata | null
): string {
  if (!metadata) {
    return text || '';
  }

  const payload: ItemDescriptionMetadata = {
    Text: text?.trim() || null,
    CustomFields: {
      Predefined: metadata.CustomFields?.Predefined || {},
      UserDefined: metadata.CustomFields?.UserDefined || {},
    },
  };

  if (metadata.MultiCount) payload.MultiCount = true;
  if (metadata.DesiredQuantity !== undefined) payload.DesiredQuantity = metadata.DesiredQuantity;
  if (metadata.Variations?.length) {
    payload.Variations = metadata.Variations;
  }
  if (metadata.LinkedItemIds?.length) payload.LinkedItemIds = metadata.LinkedItemIds;
  if (metadata.RelatedItemIds?.length) payload.RelatedItemIds = metadata.RelatedItemIds;
  if (metadata.OtherUsersCanSee !== undefined) payload.OtherUsersCanSee = metadata.OtherUsersCanSee;
  if (metadata.IsFavorite) payload.IsFavorite = true;
  if (metadata.IsPinned) payload.IsPinned = true;

  return JSON.stringify(payload);
}
