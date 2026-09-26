import type { ItemDescriptionMetadata } from '@/modules/item';
import type { GrabInfoFieldMap } from './grab-info-field-map.type';

export interface GrabInfoDescriptionMetadata {
  Text?: string | null;
  CustomFields?: {
    Predefined?: GrabInfoFieldMap;
    UserDefined?: GrabInfoFieldMap;
  };
  DesiredQuantity?: number;
  MultiCount?: boolean;
  IsFavorite?: boolean;
  IsPinned?: boolean;
  OtherUsersCanSee?: boolean;
  Variations?: ItemDescriptionMetadata['Variations'];
  LinkedItemIds?: string[];
  RelatedItemIds?: string[];
  [key: string]: unknown;
}
