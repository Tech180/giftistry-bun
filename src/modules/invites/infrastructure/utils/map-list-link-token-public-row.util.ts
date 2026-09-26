import type { ShareRole } from '@/modules/wishlist';
import type { ListLinkTokenPublic } from '../../domain/interfaces/list-link-token-public.interface';
import type { ListLinkTokenPublicRow } from '../interfaces/list-link-token-public-row.interface';

export function mapListLinkTokenPublicRow(row: ListLinkTokenPublicRow): ListLinkTokenPublic {
  return {
    Id: row.Id,
    ListId: row.ListId,
    Token: row.Token ?? null,
    Role: row.Role as ShareRole,
    CreatedBy: row.CreatedBy,
    ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
    MaxUses: row.MaxUses,
    UseCount: row.UseCount,
    RevokedAt: row.RevokedAt ? new Date(row.RevokedAt) : null,
    PasswordProtected: !!row.PasswordProtected,
    CreatedAt: new Date(row.CreatedAt),
  };
}
