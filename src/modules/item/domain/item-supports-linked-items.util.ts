import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemDescriptionMetadata } from './item-description.util';
import type { Item } from './item.entity';
import { isItemSuggestion } from './item-visibility.service';
import { resolveItemMetadata } from './resolve-item-metadata.util';

export const LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE =
  'Suggestions cannot use linked items.';

export const LINKED_ITEMS_MULTI_COUNT_UNSUPPORTED_MESSAGE =
  'Items with a quantity greater than 1 are not currently supported with the linked items feature.';

/**
 * Linked items are unsupported for suggestions, unlimited quantity (0),
 * and when quantity is greater than 1.
 */
export function itemSupportsLinkedItems(
  item: Item,
  wishlistOwnerId: string,
  metadata?: ItemDescriptionMetadata | null
): boolean {
  if (isItemSuggestion(item, wishlistOwnerId)) {
    return false;
  }

  const meta =
    metadata !== undefined ? metadata : resolveItemMetadata(item);
  const readQty = (raw: number | null | undefined): number | null => {
    if (raw == null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  };
  const topQty = readQty(item.DesiredQuantity);
  const metaQty = readQty(meta?.DesiredQuantity);
  if (topQty === 0 || metaQty === 0) {
    return false;
  }
  const desiredQuantity = Math.max(topQty ?? 1, metaQty ?? 1, 1);

  if (desiredQuantity > 1) {
    return false;
  }
  if (item.MultiCount === true || meta?.MultiCount === true) {
    return false;
  }
  return true;
}

/** Throws 400 when any item in the group cannot participate in linked items. */
export function assertLinkGroupSupportsLinkedItems(
  items: Item[],
  wishlistOwnerId: string
): void {
  for (const item of items) {
    if (itemSupportsLinkedItems(item, wishlistOwnerId)) {
      continue;
    }
    if (isItemSuggestion(item, wishlistOwnerId)) {
      throw new AppError(
        LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE,
        400,
        'BAD_REQUEST'
      );
    }
    throw new AppError(
      LINKED_ITEMS_MULTI_COUNT_UNSUPPORTED_MESSAGE,
      400,
      'BAD_REQUEST'
    );
  }
}
