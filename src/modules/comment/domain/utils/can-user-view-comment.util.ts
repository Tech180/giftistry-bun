import type { CanUserViewCommentInput } from '../interfaces/can-user-view-comment-input.interface';
import { resolveVisibilityMode } from './resolve-visibility-mode.util';

export function canUserViewComment(input: CanUserViewCommentInput): boolean {
  const { comment, viewerUserId, wishlistOwnerId, hasExpired } = input;

  if (hasExpired) {
    return true;
  }

  if (viewerUserId && comment.UserId === viewerUserId) {
    return true;
  }

  const mode = resolveVisibilityMode(comment);

  if (mode === 'visibleToSelected') {
    if (!viewerUserId) return false;
    return (comment.VisibleToUserIds ?? []).includes(viewerUserId);
  }

  if (mode === 'hiddenFromOwner') {
    if (!viewerUserId) return false;
    return viewerUserId !== wishlistOwnerId;
  }

  return true;
}
