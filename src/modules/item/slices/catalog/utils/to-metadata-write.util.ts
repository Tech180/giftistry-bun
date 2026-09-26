import type { ItemDescriptionMetadata } from '../../../domain/interfaces/item-description-metadata.interface';
import type { ItemMetadataWrite } from '../../../domain/interfaces/item-metadata-write.interface';
import { normalizeItemPhotosWrite } from '../../../domain/utils/normalize-item-photos.util';

export function toMetadataWrite(
  metadata: ItemDescriptionMetadata | null | undefined
): ItemMetadataWrite | null {
  if (!metadata) return null;
  const photos = normalizeItemPhotosWrite(metadata.Photos);
  return {
    IsFavorite: metadata.IsFavorite === true,
    IsPinned: metadata.IsPinned === true,
    DesiredQuantity: metadata.DesiredQuantity ?? null,
    MultiCount: metadata.MultiCount === true,
    OtherUsersCanSee:
      metadata.OtherUsersCanSee === undefined ? null : metadata.OtherUsersCanSee,
    AllowSubstitutions: metadata.AllowSubstitutions !== false,
    CustomFields: metadata.CustomFields ?? null,
    Variations: metadata.Variations ?? null,
    ...(photos !== undefined ? { Photos: photos ?? [] } : {}),
  };
}
