import { sql } from '@/common/database';
import type { ShareRole } from '@/modules/wishlist';
import type { ListEmailInvite } from '../../domain/interfaces/list-email-invite.interface';
import type { ListEmailInviteRepository } from '../../domain/ports/list-email-invite.repository';
import { LIST_EMAIL_INVITE_SELECT } from '../constants/list-email-invite-select.constant';
import type { ListEmailInviteRow } from '../interfaces/list-email-invite-row.interface';
import { mapListEmailInviteRow } from '../utils/map-list-email-invite-row.util';

export class PostgresListEmailInviteRepository implements ListEmailInviteRepository {
  async create(
    listId: string,
    email: string,
    role: ShareRole,
    tokenHash: string,
    invitedBy: string,
    expiresAt: Date
  ): Promise<ListEmailInvite> {
    const [row] = await sql<ListEmailInviteRow[]>`
      INSERT INTO list_email_invites (list_id, email, role, token_hash, invited_by, expires_at)
      VALUES (${listId}, ${email}, ${role}, ${tokenHash}, ${invitedBy}, ${expiresAt})
      RETURNING ${sql.unsafe(LIST_EMAIL_INVITE_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create email invite');
    }
    return mapListEmailInviteRow(row);
  }

  async findByTokenHash(tokenHash: string): Promise<ListEmailInvite | null> {
    const [row] = await sql<ListEmailInviteRow[]>`
      SELECT ${sql.unsafe(LIST_EMAIL_INVITE_SELECT)}
      FROM list_email_invites
      WHERE token_hash = ${tokenHash}
    `;
    return row ? mapListEmailInviteRow(row) : null;
  }

  async markAccepted(id: string): Promise<void> {
    await sql`
      UPDATE list_email_invites
      SET accepted_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }
}
