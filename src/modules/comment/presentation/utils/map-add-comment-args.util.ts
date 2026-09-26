import type { AddCommentRequest } from '../interfaces/add-comment-request.interface';

export function mapAddCommentArgs(
  listId: string,
  userId: string,
  fallbackUsername: string,
  raw: AddCommentRequest
) {
  return {
    listId,
    userId,
    commenterName: raw.CommenterName?.trim() || fallbackUsername,
    content: raw.Content,
    isOwnerVisible: raw.IsOwnerVisible ?? true,
    isRollover: raw.IsRollover ?? false,
    parentId: raw.ParentId || null,
    imageUrl: raw.ImageUrl || null,
    visibleToUserIds: raw.VisibleToUserIds ?? null,
  };
}
