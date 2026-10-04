import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';

/** Suggestion labels are included in exports for viewers only (not owner/collaborator). */
export function formatSuggestionForExport(
  item: WishlistExportItem,
  listRole: ListRoleLevel
): string {
  if (listRole !== 'viewer') {
    return '';
  }

  if (item.IsSuggestion) {
    return item.SuggestedByUsername?.trim() || 'Collaborator';
  }

  if (item.IsHiddenIdea) {
    return 'Hidden suggestion';
  }

  return '';
}
