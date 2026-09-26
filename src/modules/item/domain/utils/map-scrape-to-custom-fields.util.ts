import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import type { ApparelSizeKey } from '../types/apparel-size-key.type';
import { inferApparelSizeKey } from './coerce-apparel-size-fields.util';
import type { ScrapeCustomFieldsResult } from '../interfaces/scrape-custom-fields-result.interface';

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
