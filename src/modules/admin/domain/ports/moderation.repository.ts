export interface ModerationComment {
  Id: string;
  Content: string;
  CommenterName: string;
  IsDeleted: boolean;
  CreatedAt: Date | string;
  ListTitle: string;
  ListId: string;
  Username: string | null;
}

export interface ModerationCommentListResult {
  comments: ModerationComment[];
  page: number;
  total: number;
}

export interface ModerationRepository {
  listComments(page: number, limit: number): Promise<ModerationCommentListResult>;
  softDeleteComment(id: string): Promise<void>;
}
