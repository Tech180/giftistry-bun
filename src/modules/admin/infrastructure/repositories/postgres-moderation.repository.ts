import { sql } from '@/common/database';
import type { ModerationRepository } from '../../domain/ports/moderation.repository';
import type { ModerationComment } from '../../domain/interfaces/moderation-comment.interface';
import type { ModerationCommentListResult } from '../../domain/interfaces/moderation-comment-list-result.interface';
import { MODERATION_COMMENT_LIST_SELECT } from '../constants/moderation-comment-list-select.constant';

export class PostgresModerationRepository implements ModerationRepository {
  async listComments(page: number, limit: number): Promise<ModerationCommentListResult> {
    const offset = (page - 1) * limit;

    const rows = await sql<ModerationComment[]>`
      SELECT ${sql.unsafe(MODERATION_COMMENT_LIST_SELECT)}
      FROM comments c
      JOIN lists l ON l.id = c.list_id
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<{ count: number }[]>`SELECT COUNT(*)::integer as count FROM comments`;

    return {
      comments: [...rows],
      page,
      total: countRow?.count ?? 0,
    };
  }

  async softDeleteComment(id: string): Promise<void> {
    await sql`UPDATE comments SET is_deleted = true WHERE id = ${id}`;
  }
}
