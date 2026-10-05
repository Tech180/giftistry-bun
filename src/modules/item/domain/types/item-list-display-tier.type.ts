import type { ITEM_LIST_DISPLAY_TIER } from '../constants/item-list-display-tier.constant';

export type ItemListDisplayTier =
  (typeof ITEM_LIST_DISPLAY_TIER)[keyof typeof ITEM_LIST_DISPLAY_TIER];
