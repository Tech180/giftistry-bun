import type { Comment } from "./comment.entity";
import { AppError } from "@/common/middlewares/error.middleware";

export type CommentVisibilityMode =
  | "hiddenFromOwner"
  | "visibleToAll"
  | "visibleToSelected";

export function resolveVisibilityMode(
  comment: Pick<Comment, "IsOwnerVisible" | "VisibleToUserIds">
): CommentVisibilityMode {
  const selected = comment.VisibleToUserIds;
  if (Array.isArray(selected) && selected.length > 0) {
    return "visibleToSelected";
  }
  return comment.IsOwnerVisible === false ? "hiddenFromOwner" : "visibleToAll";
}

export function canUserViewComment(input: {
  comment: Pick<Comment, "UserId" | "IsOwnerVisible" | "VisibleToUserIds">;
  viewerUserId: string | null;
  wishlistOwnerId: string;
  hasExpired: boolean;
}): boolean {
  const { comment, viewerUserId, wishlistOwnerId, hasExpired } = input;

  if (hasExpired) {
    return true;
  }

  if (viewerUserId && comment.UserId === viewerUserId) {
    return true;
  }

  const mode = resolveVisibilityMode(comment);

  if (mode === "visibleToSelected") {
    if (!viewerUserId) return false;
    return (comment.VisibleToUserIds ?? []).includes(viewerUserId);
  }

  if (mode === "hiddenFromOwner") {
    if (!viewerUserId) return false;
    return viewerUserId !== wishlistOwnerId;
  }

  return true;
}

export function validateVisibilityPayload(input: {
  isOwner: boolean;
  isOwnerVisible: boolean;
  visibleToUserIds: string[] | null | undefined;
  authorUserId: string | null;
  allowedParticipantIds: Set<string>;
}): { isOwnerVisible: boolean; visibleToUserIds: string[] | null } {
  const { isOwner, isOwnerVisible, visibleToUserIds, authorUserId, allowedParticipantIds } =
    input;

  if (isOwner && !isOwnerVisible) {
    throw new AppError(
      "Forbidden: List owner cannot post non-owner-visible comments on their own list",
      403,
      "FORBIDDEN"
    );
  }

  if (!visibleToUserIds || visibleToUserIds.length === 0) {
    return {
      isOwnerVisible: isOwner ? true : isOwnerVisible,
      visibleToUserIds: null,
    };
  }

  const unique = [...new Set(visibleToUserIds.filter(Boolean))];
  for (const userId of unique) {
    if (!allowedParticipantIds.has(userId)) {
      throw new AppError(
        "One or more selected users do not have access to this wishlist",
        400,
        "BAD_REQUEST"
      );
    }
  }

  void authorUserId;

  return {
    isOwnerVisible: true,
    visibleToUserIds: unique,
  };
}

const USER_MENTION_REGEX = /\[([^\]]+)\]\(user:([^)]+)\)/g;

export function extractMentionedUserIds(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(USER_MENTION_REGEX)) {
    const id = match[2];
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

export function validateMentionsInAudience(
  content: string,
  visibleToUserIds: string[] | null,
  authorUserId: string | null
): void {
  if (!visibleToUserIds || visibleToUserIds.length === 0) {
    return;
  }
  const allowed = new Set(visibleToUserIds);
  if (authorUserId) {
    allowed.add(authorUserId);
  }
  for (const mentionedId of extractMentionedUserIds(content)) {
    if (!allowed.has(mentionedId)) {
      throw new AppError(
        "Mentioned users must be included in the selected comment audience",
        400,
        "BAD_REQUEST"
      );
    }
  }
}
