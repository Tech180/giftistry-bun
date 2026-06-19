import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { ListShare, ListRole } from '../domain/list-share.entity';
import { sql } from '@/common/database/connection';

export class PostgresListShareRepository implements ListShareRepository {
  async addShare(listId: string, userId: string, role: 'viewer' | 'collaborator'): Promise<ListShare> {
    const [row] = await sql<any[]>`
      INSERT INTO list_shares (list_id, user_id, role)
      VALUES (${listId}, ${userId}, ${role})
      ON CONFLICT (list_id, user_id) DO UPDATE SET role = ${role}
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", role as "Role", created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to create or update list share');
    }
    return {
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      Role: row.Role as 'viewer' | 'collaborator',
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async getRole(listId: string, userId: string): Promise<ListRole | null> {
    // 1. Check if user is owner of the list
    const [list] = await sql<any[]>`
      SELECT user_id as "userId" FROM lists WHERE id = ${listId}
    `;
    if (list && list.userId === userId) {
      return 'owner';
    }

    // 2. Check if user has an explicit collaborator/viewer share
    const [share] = await sql<any[]>`
      SELECT role as "role" FROM list_shares WHERE list_id = ${listId} AND user_id = ${userId}
    `;
    if (share) {
      return share.role as ListRole;
    }

    return null;
  }

  async findListIdByItemId(itemId: string): Promise<string | null> {
    const [item] = await sql<any[]>`
      SELECT list_id as "listId" FROM items WHERE id = ${itemId}
    `;
    return item ? item.listId : null;
  }

  async findSharesByListId(listId: string): Promise<ListShare[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", role as "Role", created_at as "CreatedAt"
      FROM list_shares
      WHERE list_id = ${listId}
    `;
    return rows.map(row => ({
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      Role: row.Role as 'viewer' | 'collaborator',
      CreatedAt: new Date(row.CreatedAt),
    }));
  }
}
