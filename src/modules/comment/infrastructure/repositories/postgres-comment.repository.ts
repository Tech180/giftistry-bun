import { sql } from '@/common/database';
import type { Comment } from '../../domain/interfaces/comment.interface';
import type { CreateCommentInput } from '../../domain/interfaces/create-comment-input.interface';
import type { CommentRepository } from '../../domain/ports/comment.repository';
import { COMMENT_SELECT } from '../constants/comment-select.constant';
import { DELETED_COMMENT_CONTENT } from '../constants/deleted-comment-content.constant';
import type { CommentReactionRow } from '../interfaces/comment-reaction-row.interface';
import type { CommentRow } from '../interfaces/comment-row.interface';
import { mapCommentReactionRow } from '../utils/map-comment-reaction-row.util';
import { mapCommentRow } from '../utils/map-comment-row.util';

export class PostgresCommentRepository implements CommentRepository {
  async create(input: CreateCommentInput): Promise<Comment> {
    const {
      listId,
      userId,
      commenterName,
      content,
      isOwnerVisible,
      isRollover,
      parentId,
      imageUrl,
      visibleToUserIds,
    } = input;
    const visibleJson =
      visibleToUserIds && visibleToUserIds.length > 0
        ? JSON.stringify(visibleToUserIds)
        : null;
    const [row] = await sql<CommentRow[]>`
      INSERT INTO comments (
        list_id, user_id, commenter_name, content, is_owner_visible, is_rollover,
        parent_id, image_url, visible_to_user_ids
      )
      VALUES (
        ${listId}, ${userId}, ${commenterName}, ${content}, ${isOwnerVisible}, ${isRollover},
        ${parentId || null}, ${imageUrl || null}, ${visibleJson}::jsonb
      )
      RETURNING ${sql.unsafe(COMMENT_SELECT)}
    `;
    if (!row) throw new Error('Failed to create comment');
    return mapCommentRow(row, []);
  }

  async findByListId(listId: string): Promise<Comment[]> {
    const rows = await sql<CommentRow[]>`
      SELECT ${sql.unsafe(COMMENT_SELECT)}
      FROM comments
      WHERE list_id = ${listId}
      ORDER BY created_at ASC
    `;

    if (rows.length === 0) return [];

    const commentIds = rows.map((r) => r.Id);
    const reactions = await sql<CommentReactionRow[]>`
      SELECT comment_id as "CommentId", user_id as "UserId", username as "Username", reaction as "Reaction"
      FROM comment_reactions
      WHERE comment_id IN ${sql(commentIds)}
    `;

    const reactionMap: Record<string, ReturnType<typeof mapCommentReactionRow>[]> = {};
    for (const rx of reactions) {
      const commentId = rx.CommentId;
      if (!commentId) continue;
      const list = reactionMap[commentId] ?? [];
      list.push(mapCommentReactionRow(rx));
      reactionMap[commentId] = list;
    }

    return rows.map((row) => mapCommentRow(row, reactionMap[row.Id] || []));
  }

  async findById(commentId: string): Promise<Comment | null> {
    const [row] = await sql<CommentRow[]>`
      SELECT ${sql.unsafe(COMMENT_SELECT)}
      FROM comments
      WHERE id = ${commentId}
    `;
    if (!row) return null;

    const reactions = await sql<CommentReactionRow[]>`
      SELECT user_id as "UserId", username as "Username", reaction as "Reaction"
      FROM comment_reactions
      WHERE comment_id = ${commentId}
    `;

    return mapCommentRow(row, reactions.map(mapCommentReactionRow));
  }

  async toggleReaction(
    commentId: string,
    userId: string,
    username: string,
    reaction: string
  ): Promise<{ added: boolean }> {
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM comment_reactions
      WHERE comment_id = ${commentId} AND user_id = ${userId} AND reaction = ${reaction}
    `;

    if (existing) {
      await sql`
        DELETE FROM comment_reactions
        WHERE comment_id = ${commentId} AND user_id = ${userId} AND reaction = ${reaction}
      `;
      return { added: false };
    }

    await sql`
      INSERT INTO comment_reactions (comment_id, user_id, username, reaction)
      VALUES (${commentId}, ${userId}, ${username}, ${reaction})
    `;
    return { added: true };
  }

  async deleteByIdAndUserId(commentId: string, userId: string): Promise<boolean> {
    const result = await sql`
      UPDATE comments
      SET is_deleted = TRUE, content = ${DELETED_COMMENT_CONTENT}
      WHERE id = ${commentId} AND user_id = ${userId}
    `;
    return result.count > 0;
  }
}
