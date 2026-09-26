export interface AddCommentRequest {
  Content: string;
  CommenterName?: string | null;
  IsOwnerVisible?: boolean;
  IsRollover?: boolean;
  ParentId?: string | null;
  ImageUrl?: string | null;
  VisibleToUserIds?: string[] | null;
}
