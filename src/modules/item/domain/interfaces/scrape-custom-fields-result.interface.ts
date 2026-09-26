import type { ApparelSizeKey } from '../types/apparel-size-key.type';

export interface ScrapeCustomFieldsResult {
  predefinedFields: Record<string, string>;
  userDefinedFields: Record<string, string>;
  apparelSizeKey?: ApparelSizeKey | null;
}
