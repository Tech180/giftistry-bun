import type { ImportedItemCustomFields } from './imported-item-custom-fields.interface';
export interface ImportedItemPreview {
  name: string;
  category?: string;
  priority?: number;
  description?: string;
  price?: number | null;
  websiteLink?: string;
  isFavorite?: boolean;
  color?: string;
  size?: string;
  desiredQuantity?: number;
  customFields?: ImportedItemCustomFields;
}
