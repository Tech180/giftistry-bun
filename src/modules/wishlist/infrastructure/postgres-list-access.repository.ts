import type { ListAccessRepository, ListAccessInfo } from '../domain/ports/list-access.repository';
import { sql } from '@/common/database/connection';

export class PostgresListAccessRepository implements ListAccessRepository {
  async findAccessInfo(listId: string): Promise<ListAccessInfo | null> {
    const [row] = await sql<any[]>`
      SELECT l.id as "listId", l.user_id as "ownerId",
             l.expires_at as "expiresAt", l.is_active as "isActive",
             owner.is_disabled as "ownerDisabled"
      FROM lists l
      JOIN users owner ON owner.id = l.user_id
      WHERE l.id = ${listId}
    `;
    if (!row) return null;
    return {
      listId: row.listId,
      ownerId: row.ownerId,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
      isActive: row.isActive,
      ownerDisabled: row.ownerDisabled,
    };
  }

  async findListIdByItemId(itemId: string): Promise<string | null> {
    const [row] = await sql<any[]>`
      SELECT list_id as "listId" FROM items WHERE id = ${itemId}
    `;
    return row?.listId ?? null;
  }
}
