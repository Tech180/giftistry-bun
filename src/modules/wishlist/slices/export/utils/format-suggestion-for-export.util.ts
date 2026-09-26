import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';

export function formatSuggestionForExport(item: WishlistExportItem, isOwner: boolean): string {
  if (isOwner) {
    return '';
  }
  if (item.IsSuggestion) {
    return item.SuggestedByUsername || 'Collaborator';
  }
  if (item.IsHiddenIdea) {
    return 'Hidden suggestion';
  }
  return '';
}
