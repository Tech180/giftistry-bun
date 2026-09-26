import type { ModerationCommentListResult } from '../interfaces/moderation-comment-list-result.interface';

export interface ModerationRepository {
  listComments(page: number, limit: number): Promise<ModerationCommentListResult>;
  softDeleteComment(id: string): Promise<void>;
}
