import type { Item } from '../../../domain/interfaces/item.interface';
import type { ItemSubstitutionRow } from '../../../domain/interfaces/item-substitution-row.interface';

/**
 * Claimer custom substitutions with IsHiddenIdea are hidden from the list owner
 * (same idea as suggestion visibility). Creators and other viewers still see them.
 */
export function canViewerSeeSubstitutionOption(input: {
  row: ItemSubstitutionRow;
  child: Item;
  wishlistOwnerId: string;
  currentUserId: string | null | undefined;
}): boolean {
  const { row, child, wishlistOwnerId, currentUserId } = input;
  if (row.Kind !== 'claimer_custom' || !child.IsHiddenIdea) {
    return true;
  }
  if (!currentUserId) {
    return false;
  }
  if (currentUserId === wishlistOwnerId) {
    return false;
  }
  return true;
}
