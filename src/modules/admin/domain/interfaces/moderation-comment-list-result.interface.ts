import type { ModerationComment } from './moderation-comment.interface';

export interface ModerationCommentListResult {
  comments: ModerationComment[];
  page: number;
  total: number;
}
