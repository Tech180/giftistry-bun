import type { ItemDescriptionMetadata } from '../../../domain/interfaces/item-description-metadata.interface';
import type { ItemMetadataWrite } from '../../../domain/interfaces/item-metadata-write.interface';
import { normalizeItemPhotosWrite } from '../../../domain/utils/normalize-item-photos.util';
import { resolvePlainDescriptionText } from '../../../domain/utils/resolve-item-metadata.util';
import type { CreateSubstitutionPayload } from '../interfaces/create-substitution-payload.interface';

/**
 * Map substitution Metadata to column writes.
 * Ignores Linked/Related/audience/AllowSubstitutions — children do not own those.
 */
export function toSubstitutionMetadataWrite(
  metadata: ItemDescriptionMetadata | null | undefined
): ItemMetadataWrite | null {
  if (!metadata) return null;
  const photos = normalizeItemPhotosWrite(metadata.Photos);
  return {
    IsFavorite: metadata.IsFavorite === true,
    IsPinned: metadata.IsPinned === true,
    DesiredQuantity: metadata.DesiredQuantity ?? null,
    MultiCount: metadata.MultiCount === true,
    OtherUsersCanSee: null,
    AllowSubstitutions: true,
    CustomFields: metadata.CustomFields ?? null,
    Variations: metadata.Variations ?? null,
    ...(photos !== undefined ? { Photos: photos ?? [] } : {}),
  };
}

export function resolveSubstitutionDescription(
  payload: CreateSubstitutionPayload
): string | null {
  return resolvePlainDescriptionText(payload.Description, payload.Metadata ?? null);
}

export function hasSubstitutionPhotos(
  metadata: ItemDescriptionMetadata | null | undefined
): boolean {
  return Array.isArray(metadata?.Photos) && metadata!.Photos!.length > 0;
}

/** Resolve claimer-custom visibility; owner-approved is never hidden. */
export function resolveClaimerSubstitutionHidden(
  kind: 'owner_approved' | 'claimer_custom',
  isHiddenIdea: boolean | null | undefined
): boolean {
  if (kind !== 'claimer_custom') return false;
  return isHiddenIdea !== false;
}
