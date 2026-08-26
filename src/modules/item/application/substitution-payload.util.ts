import type { ItemDescriptionMetadata } from '../domain/item-description.util';
import type { ItemMetadataWrite } from '../domain/ports/item.repository';
import { normalizeItemPhotosWrite } from '../domain/normalize-item-photos.util';
import { resolvePlainDescriptionText } from '../domain/resolve-item-metadata.util';

/** Product-field subset accepted on substitution create/update bodies. */
export interface CreateSubstitutionPayload {
  Name: string;
  Description?: string | null;
  LinkUrl?: string | null;
  Price?: number | null;
  WebsiteName?: string | null;
  Category?: string | null;
  PriorityId?: string | null;
  Priority?: number | null;
  /** Claimer custom only: hide from list owner when true (default true on create if omitted). */
  IsHiddenIdea?: boolean | null;
  Metadata?: ItemDescriptionMetadata | null;
}

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
