export interface CommentRow {
  Id: string;
  ListId: string;
  UserId: string | null;
  CommenterName: string;
  Content: string;
  IsOwnerVisible: boolean;
  VisibleToUserIds: unknown;
  IsRollover: boolean;
  IsDeleted?: boolean;
  ParentId?: string | null;
  ImageUrl?: string | null;
  CreatedAt: Date | string;
}
