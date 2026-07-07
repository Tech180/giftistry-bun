import type { ListEmailInviteRepository } from '../domain/ports/list-email-invite.repository';
import type { ListEmailInvite } from '../domain/invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';
import { sql } from '@/common/database/connection';

export class PostgresListEmailInviteRepository implements ListEmailInviteRepository {
  async create(
    listId: string,
    email: string,
    role: ShareRole,
    tokenHash: string,
    invitedBy: string,
    expiresAt: Date
  ): Promise<ListEmailInvite> {
    const [row] = await sql<any[]>`
      INSERT INTO list_email_invites (list_id, email, role, token_hash, invited_by, expires_at)
      VALUES (${listId}, ${email}, ${role}, ${tokenHash}, ${invitedBy}, ${expiresAt})
      RETURNING id as "Id", list_id as "ListId", email as "Email", role as "Role",
                token_hash as "TokenHash", invited_by as "InvitedBy", expires_at as "ExpiresAt",
                accepted_at as "AcceptedAt", created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to create email invite');
    return this.mapInvite(row);
  }

  async findByTokenHash(tokenHash: string): Promise<ListEmailInvite | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", email as "Email", role as "Role",
             token_hash as "TokenHash", invited_by as "InvitedBy", expires_at as "ExpiresAt",
             accepted_at as "AcceptedAt", created_at as "CreatedAt"
      FROM list_email_invites
      WHERE token_hash = ${tokenHash}
    `;
    return row ? this.mapInvite(row) : null;
  }

  async markAccepted(id: string): Promise<void> {
    await sql`
      UPDATE list_email_invites
      SET accepted_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }

  private mapInvite(row: any): ListEmailInvite {
    return {
      Id: row.Id,
      ListId: row.ListId,
      Email: row.Email,
      Role: row.Role as ShareRole,
      TokenHash: row.TokenHash,
      InvitedBy: row.InvitedBy,
      ExpiresAt: new Date(row.ExpiresAt),
      AcceptedAt: row.AcceptedAt ? new Date(row.AcceptedAt) : null,
      CreatedAt: new Date(row.CreatedAt),
    };
  }
}
