import type { CommentVisibilityMode } from '../types/comment-visibility-mode.type';
import type { CommentVisibilityFields } from '../interfaces/comment-visibility-fields.interface';

export function resolveVisibilityMode(comment: CommentVisibilityFields): CommentVisibilityMode {
  const selected = comment.VisibleToUserIds;
  if (Array.isArray(selected) && selected.length > 0) {
    return 'visibleToSelected';
  }
  return comment.IsOwnerVisible === false ? 'hiddenFromOwner' : 'visibleToAll';
}
