import type { Comment } from '../../domain/interfaces/comment.interface';
import type { CommentReaction } from '../../domain/interfaces/comment-reaction.interface';
import type { CommentRow } from '../interfaces/comment-row.interface';
import { parseVisibleToUserIds } from './parse-visible-to-user-ids.util';

export function mapCommentRow(
  row: CommentRow,
  reactions: CommentReaction[] = []
): Comment {
  return {
    Id: row.Id,
    ListId: row.ListId,
    UserId: row.UserId,
    CommenterName: row.CommenterName,
    Content: row.Content,
    IsOwnerVisible: row.IsOwnerVisible,
    VisibleToUserIds: parseVisibleToUserIds(row.VisibleToUserIds),
    IsRollover: row.IsRollover,
    IsDeleted: row.IsDeleted,
    ParentId: row.ParentId,
    ImageUrl: row.ImageUrl,
    CreatedAt: new Date(row.CreatedAt),
    Reactions: reactions,
  };
}
