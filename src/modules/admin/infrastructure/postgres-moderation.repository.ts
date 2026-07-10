import { sql } from '@/common/database/connection';
import type {
  ModerationComment,
  ModerationCommentListResult,
  ModerationRepository,
} from '../domain/ports/moderation.repository';

export class PostgresModerationRepository implements ModerationRepository {
  async listComments(page: number, limit: number): Promise<ModerationCommentListResult> {
    const offset = (page - 1) * limit;

    const rows = await sql<ModerationComment[]>`
      SELECT c.id as "Id", c.content as "Content", c.commenter_name as "CommenterName",
             c.is_deleted as "IsDeleted", c.created_at as "CreatedAt",
             l.title as "ListTitle", l.id as "ListId", u.username as "Username"
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
