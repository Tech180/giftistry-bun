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
    const [item] = await sql<{ listId: string }[]>`
      SELECT list_id as "listId" FROM items WHERE id = ${itemId}
    `;
    if (item?.listId) return item.listId;

    // PUT/DELETE `/items/:id/substitution` pass item_substitutions.id, not items.id.
    const [viaSubstitution] = await sql<{ listId: string }[]>`
      SELECT i.list_id as "listId"
      FROM item_substitutions s
      JOIN items i ON i.id = s.parent_item_id
      WHERE s.id = ${itemId}
    `;
    return viaSubstitution?.listId ?? null;
  }
}
