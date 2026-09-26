import type { CommentReaction } from '../../domain/interfaces/comment-reaction.interface';
import type { CommentReactionRow } from '../interfaces/comment-reaction-row.interface';

export function mapCommentReactionRow(row: CommentReactionRow): CommentReaction {
  return {
    userId: row.UserId,
    username: row.Username,
    reaction: row.Reaction,
  };
}
