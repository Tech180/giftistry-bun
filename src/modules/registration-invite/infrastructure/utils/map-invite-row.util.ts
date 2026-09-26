import type { RegistrationInvite } from '../../domain/interfaces/registration-invite.interface';
import type { InviteRow } from '../interfaces/invite-row.interface';

export function mapInviteRow(row: InviteRow): RegistrationInvite {
  return {
    Id: row.Id,
    TokenHash: row.TokenHash,
    Token: row.Token ?? null,
    ExpiresAt: new Date(row.ExpiresAt),
    MaxUses: row.MaxUses ?? null,
    UseCount: row.UseCount ?? 0,
    CreatedBy: row.CreatedBy ?? null,
    CreatedAt: new Date(row.CreatedAt),
    RevokedAt: row.RevokedAt ? new Date(row.RevokedAt) : null,
  };
}
