import type { ShareRole } from '@/modules/wishlist';
import type { ListLinkToken } from '../../domain/interfaces/list-link-token.interface';
import type { ListLinkTokenRow } from '../interfaces/list-link-token-row.interface';

export function mapListLinkTokenRow(row: ListLinkTokenRow): ListLinkToken {
  return {
    Id: row.Id,
    ListId: row.ListId,
    TokenHash: row.TokenHash,
    Token: row.Token ?? null,
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
