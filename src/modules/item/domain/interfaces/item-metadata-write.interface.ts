import type { ItemDescriptionMetadata } from './item-description-metadata.interface';
import type { ItemPhoto } from './item-photo.interface';

export interface ItemMetadataWrite {
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  OtherUsersCanSee?: boolean | null;
  AllowSubstitutions?: boolean;
  CustomFields?: ItemDescriptionMetadata['CustomFields'] | null;
  Variations?: ItemDescriptionMetadata['Variations'] | null;
  /**
   * Ordered photos. On create: default []. On update: `undefined` leaves existing
   * photos unchanged; `[]` or values replaces the full set.
   */
  Photos?: ItemPhoto[] | null;
}
