import type { ItemAudienceUser } from '../../domain/interfaces/item-audience-user.interface';
import type { ItemAudienceUserRow } from '../interfaces/item-audience-user-row.interface';

export function mapItemAudienceUserRow(row: ItemAudienceUserRow): ItemAudienceUser {
  return {
    UserId: row.UserId,
    Username: row.Username ?? null,
    FirstName: row.FirstName ?? null,
    LastName: row.LastName ?? null,
    Email: row.Email ?? null,
  };
}
