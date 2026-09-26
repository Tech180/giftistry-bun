import type { ItemPhotoWrite } from './item-photo-write.interface';
export interface ItemDescriptionMetadata {
  Text: string | null;
  CustomFields?: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  };
  DesiredQuantity?: number;
  Variations?: Array<{ Name: string; Quantity: number }>;
  LinkedItemIds?: string[];
  RelatedItemIds?: string[];
  OtherUsersCanSee?: boolean;
  MultiCount?: boolean;
  IsFavorite?: boolean;
  IsPinned?: boolean;
  AllowSubstitutions?: boolean;
  /**
   * Ordered photo data URLs for write payloads.
   * On update: omit to leave unchanged; `[]` clears; non-empty replaces.
   */
  Photos?: ItemPhotoWrite[] | null;
}
