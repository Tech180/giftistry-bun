import { sql } from '@/common/database';
import type { ShareRole } from '@/modules/wishlist';
import type { ListLinkToken } from '../../domain/interfaces/list-link-token.interface';
import type { ListLinkTokenPublic } from '../../domain/interfaces/list-link-token-public.interface';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';
import { LIST_LINK_TOKEN_PUBLIC_SELECT } from '../constants/list-link-token-public-select.constant';
import { LIST_LINK_TOKEN_SELECT } from '../constants/list-link-token-select.constant';
import type { ListLinkTokenPublicRow } from '../interfaces/list-link-token-public-row.interface';
import type { ListLinkTokenRow } from '../interfaces/list-link-token-row.interface';
import { mapListLinkTokenPublicRow } from '../utils/map-list-link-token-public-row.util';
import { mapListLinkTokenRow } from '../utils/map-list-link-token-row.util';

export class PostgresListLinkTokenRepository implements ListLinkTokenRepository {
  async create(
    listId: string,
    tokenHash: string,
    token: string,
    role: ShareRole,
    createdBy: string,
    expiresAt: Date | null = null,
    maxUses: number | null = null,
    passwordHash: string | null = null
  ): Promise<ListLinkToken> {
    const [row] = await sql<ListLinkTokenRow[]>`
      INSERT INTO list_link_tokens (list_id, token_hash, token, role, created_by, expires_at, max_uses, password_hash)
      VALUES (${listId}, ${tokenHash}, ${token}, ${role}, ${createdBy}, ${expiresAt}, ${maxUses}, ${passwordHash})
      RETURNING ${sql.unsafe(LIST_LINK_TOKEN_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create link invite');
    }
    return mapListLinkTokenRow(row);
  }

  async findByListId(listId: string): Promise<ListLinkTokenPublic[]> {
    const rows = await sql<ListLinkTokenPublicRow[]>`
      SELECT ${sql.unsafe(LIST_LINK_TOKEN_PUBLIC_SELECT)}
      FROM list_link_tokens
      WHERE list_id = ${listId} AND revoked_at IS NULL
      ORDER BY created_at DESC
    `;
    return rows.map(mapListLinkTokenPublicRow);
  }

  async findByTokenHash(tokenHash: string): Promise<ListLinkToken | null> {
    const [row] = await sql<ListLinkTokenRow[]>`
      SELECT ${sql.unsafe(LIST_LINK_TOKEN_SELECT)}
      FROM list_link_tokens
      WHERE token_hash = ${tokenHash}
    `;
    return row ? mapListLinkTokenRow(row) : null;
  }

  async revoke(id: string, listId: string): Promise<void> {
    await sql`
      UPDATE list_link_tokens
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND list_id = ${listId}
    `;
  }

  async incrementUseCount(id: string): Promise<void> {
    await sql`
      UPDATE list_link_tokens
      SET use_count = use_count + 1
      WHERE id = ${id}
    `;
  }
}
