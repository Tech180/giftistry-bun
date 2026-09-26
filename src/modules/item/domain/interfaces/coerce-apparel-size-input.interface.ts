import type { ApparelSizeKey } from '../types/apparel-size-key.type';

export interface CoerceApparelSizeInput {
  predefinedFields: Record<string, string>;
  url?: string;
  title?: string;
  category?: string | null;
  size?: string | null;
  /** When scrape already chose one size key, prefer keeping it over AI extras. */
  scrapePreferredKey?: ApparelSizeKey | null;
}
