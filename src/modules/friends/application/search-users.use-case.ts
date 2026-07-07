import type { UserSearchResult } from '../domain/friend.entity';
import { sql } from '@/common/database/connection';
import { AppError } from '@/common/middlewares/error.middleware';

export class SearchUsersUseCase {
  async execute(userId: string, query: string): Promise<UserSearchResult[]> {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400, 'BAD_REQUEST');
    }

    const pattern = `%${trimmed}%`;
    const rows = await sql<any[]>`
      SELECT id as "Id", username as "Username", first_name as "FirstName",
             last_name as "LastName", avatar as "Avatar"
      FROM users
      WHERE id != ${userId}
        AND is_hidden = false
        AND is_disabled = false
        AND (
          username ILIKE ${pattern}
          OR first_name ILIKE ${pattern}
          OR last_name ILIKE ${pattern}
          OR email ILIKE ${pattern}
        )
      ORDER BY username ASC
      LIMIT 20
    `;

    return rows.map(row => ({
      Id: row.Id,
      Username: row.Username,
      FirstName: row.FirstName,
      LastName: row.LastName,
      Avatar: row.Avatar ?? null,
    }));
  }
}
