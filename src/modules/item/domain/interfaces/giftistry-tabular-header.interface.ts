import type { GiftistryTabularDelimiter } from '../types/giftistry-tabular-delimiter.type';

export interface GiftistryTabularHeader {
  headerIndex: number;
  delimiter: GiftistryTabularDelimiter;
  lines: string[];
}
