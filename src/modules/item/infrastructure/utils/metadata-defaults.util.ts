import type { ItemMetadataWrite } from '../../domain/interfaces/item-metadata-write.interface';
import type { ItemPhoto } from '../../domain/interfaces/item-photo.interface';

export function metadataDefaults(metadata?: ItemMetadataWrite | null) {
  return {
    isFavorite: metadata?.IsFavorite === true,
    isPinned: metadata?.IsPinned === true,
    desiredQuantity:
      metadata?.DesiredQuantity !== undefined ? metadata.DesiredQuantity : null,
    multiCount: metadata?.MultiCount === true,
    otherUsersCanSee:
      metadata?.OtherUsersCanSee !== undefined ? metadata.OtherUsersCanSee : null,
    allowSubstitutions: metadata?.AllowSubstitutions !== false,
    customFields: metadata?.CustomFields ?? {},
    variations: metadata?.Variations ?? [],
    photos: (metadata?.Photos ?? []) as ItemPhoto[],
  };
}
