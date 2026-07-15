import type { ExtractedMetadata } from './extracted-metadata';
import {
  inferApparelSizeKey,
  type ApparelSizeKey,
} from './coerce-apparel-size-fields.util';

export interface ScrapeCustomFieldsResult {
  predefinedFields: Record<string, string>;
  userDefinedFields: Record<string, string>;
  apparelSizeKey?: ApparelSizeKey | null;
}

export function mapScrapeToCustomFields(
  data: ExtractedMetadata,
  url: string
): ScrapeCustomFieldsResult {
  const predefinedFields: Record<string, string> = {};
  const userDefinedFields: Record<string, string> = {};
  let apparelSizeKey: ApparelSizeKey | null = null;

  if (data.color?.trim()) {
    predefinedFields.Color = data.color.trim();
  }

  if (data.size?.trim()) {
    const sizeVal = data.size.trim();
    const fieldKey = inferApparelSizeKey(sizeVal, url, data.title || '', data.category);
    if (fieldKey) {
      predefinedFields[fieldKey] = sizeVal;
      apparelSizeKey = fieldKey;
    }
  }

  return { predefinedFields, userDefinedFields, apparelSizeKey };
}
