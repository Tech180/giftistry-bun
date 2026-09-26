import type { ListShare } from '../../domain/interfaces/list-share.interface';
import type { ListShareRow } from '../interfaces/list-share-row.interface';

export function mapListShareRow(row: ListShareRow): ListShare {
  return {
    Id: row.Id,
    ListId: row.ListId,
    UserId: row.UserId,
    Role: row.Role,
    GrantedVia: row.GrantedVia ?? undefined,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
  };
}
