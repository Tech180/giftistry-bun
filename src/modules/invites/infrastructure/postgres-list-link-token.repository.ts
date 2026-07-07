import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';
import type { ListLinkToken, ListLinkTokenPublic } from '../domain/invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';
import { sql } from '@/common/database/connection';

export class PostgresListLinkTokenRepository implements ListLinkTokenRepository {
  async create(
    listId: string,
    tokenHash: string,
    role: ShareRole,
    createdBy: string,
    expiresAt: Date | null = null,
    maxUses: number | null = null,
    passwordHash: string | null = null
  ): Promise<ListLinkToken> {
    const [row] = await sql<any[]>`
      INSERT INTO list_link_tokens (list_id, token_hash, role, created_by, expires_at, max_uses, password_hash)
      VALUES (${listId}, ${tokenHash}, ${role}, ${createdBy}, ${expiresAt}, ${maxUses}, ${passwordHash})
      RETURNING id as "Id", list_id as "ListId", token_hash as "TokenHash", role as "Role",
                created_by as "CreatedBy", expires_at as "ExpiresAt", max_uses as "MaxUses",
                use_count as "UseCount", revoked_at as "RevokedAt", created_at as "CreatedAt",
                password_hash as "PasswordHash"
    `;
    if (!row) throw new Error('Failed to create link invite');
    return this.mapToken(row);
  }

  async findByListId(listId: string): Promise<ListLinkTokenPublic[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", role as "Role", created_by as "CreatedBy",
             expires_at as "ExpiresAt", max_uses as "MaxUses", use_count as "UseCount",
             revoked_at as "RevokedAt", created_at as "CreatedAt",
             (password_hash IS NOT NULL) as "PasswordProtected"
      FROM list_link_tokens
      WHERE list_id = ${listId} AND revoked_at IS NULL
      ORDER BY created_at DESC
    `;
    return rows.map(row => ({
      Id: row.Id,
      ListId: row.ListId,
      Role: row.Role as ShareRole,
      CreatedBy: row.CreatedBy,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      MaxUses: row.MaxUses,
      UseCount: row.UseCount,
      RevokedAt: row.RevokedAt ? new Date(row.RevokedAt) : null,
      PasswordProtected: !!row.PasswordProtected,
      CreatedAt: new Date(row.CreatedAt),
    }));
  }

  async findByTokenHash(tokenHash: string): Promise<ListLinkToken | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", token_hash as "TokenHash", role as "Role",
             created_by as "CreatedBy", expires_at as "ExpiresAt", max_uses as "MaxUses",
             use_count as "UseCount", revoked_at as "RevokedAt", created_at as "CreatedAt",
             password_hash as "PasswordHash"
      FROM list_link_tokens
      WHERE token_hash = ${tokenHash}
    `;
    return row ? this.mapToken(row) : null;
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

  private mapToken(row: any): ListLinkToken {
    return {
      Id: row.Id,
      ListId: row.ListId,
      TokenHash: row.TokenHash,
      Role: row.Role as ShareRole,
      CreatedBy: row.CreatedBy,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      MaxUses: row.MaxUses,
      UseCount: row.UseCount,
      RevokedAt: row.RevokedAt ? new Date(row.RevokedAt) : null,
      PasswordHash: row.PasswordHash,
      CreatedAt: new Date(row.CreatedAt),
    };
  }
}
