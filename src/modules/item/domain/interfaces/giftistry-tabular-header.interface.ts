import type { GiftistryTabularColumnKey } from '../types/giftistry-tabular-column-key.type';
import type { GiftistryTabularDelimiter } from '../types/giftistry-tabular-delimiter.type';

export interface GiftistryTabularHeader {
  headerIndex: number;
  delimiter: GiftistryTabularDelimiter;
  lines: string[];
  columnCount: number;
  columnIndexByKey: Partial<Record<GiftistryTabularColumnKey, number>>;
}
