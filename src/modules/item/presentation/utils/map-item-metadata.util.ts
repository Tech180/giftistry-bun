import type { ItemDescriptionMetadata } from '../../domain/interfaces/item-description-metadata.interface';
import type { RawItemMetadataRequest } from '../interfaces/raw-item-metadata-request.interface';

function mapCustomFields(
  raw: RawItemMetadataRequest['CustomFields']
): ItemDescriptionMetadata['CustomFields'] | undefined {
  if (raw == null) return undefined;
  return {
    ...(raw.Predefined != null ? { Predefined: raw.Predefined } : {}),
    ...(raw.UserDefined != null ? { UserDefined: raw.UserDefined } : {}),
  };
}

/** Normalize Elysia optional body metadata into domain `ItemDescriptionMetadata`. */
export function mapItemMetadata(
  raw: RawItemMetadataRequest | null | undefined
): ItemDescriptionMetadata | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;

  const metadata: ItemDescriptionMetadata = {
    Text: raw.Text ?? null,
  };

  const customFields = mapCustomFields(raw.CustomFields);
  if (customFields && (customFields.Predefined || customFields.UserDefined)) {
    metadata.CustomFields = customFields;
  }
  if (raw.DesiredQuantity != null) metadata.DesiredQuantity = Number(raw.DesiredQuantity);
  if (raw.Variations != null) metadata.Variations = raw.Variations;
  if (raw.LinkedItemIds != null) metadata.LinkedItemIds = raw.LinkedItemIds;
  if (raw.RelatedItemIds != null) metadata.RelatedItemIds = raw.RelatedItemIds;
  if (raw.OtherUsersCanSee != null) metadata.OtherUsersCanSee = raw.OtherUsersCanSee;
  if (raw.MultiCount != null) metadata.MultiCount = raw.MultiCount;
  if (raw.IsFavorite != null) metadata.IsFavorite = raw.IsFavorite;
  if (raw.IsPinned != null) metadata.IsPinned = raw.IsPinned;
  if (raw.AllowSubstitutions != null) metadata.AllowSubstitutions = raw.AllowSubstitutions;
  if (raw.Photos !== undefined) metadata.Photos = raw.Photos;

  return metadata;
}
