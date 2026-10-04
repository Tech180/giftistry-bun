import type { GIFTISTRY_TABULAR_COLUMN_KEYS } from '../constants/giftistry-csv-headers.constant';

export type GiftistryTabularColumnKey =
  | (typeof GIFTISTRY_TABULAR_COLUMN_KEYS)[number]
  | 'audience'
  | 'suggestion';
