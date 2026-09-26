export interface CreateCommentInput {
  listId: string;
  userId: string | null;
  commenterName: string;
  content: string;
  isOwnerVisible: boolean;
  isRollover: boolean;
  parentId?: string | null;
  imageUrl?: string | null;
  visibleToUserIds?: string[] | null;
}
