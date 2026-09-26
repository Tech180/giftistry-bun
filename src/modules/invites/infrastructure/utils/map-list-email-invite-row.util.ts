import type { ShareRole } from '@/modules/wishlist';
import type { ListEmailInvite } from '../../domain/interfaces/list-email-invite.interface';
import type { ListEmailInviteRow } from '../interfaces/list-email-invite-row.interface';

export function mapListEmailInviteRow(row: ListEmailInviteRow): ListEmailInvite {
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
