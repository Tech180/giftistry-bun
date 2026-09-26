import type { ListShareWithUser } from '../../domain/interfaces/list-share-with-user.interface';
import type { ListShareWithUserRow } from '../interfaces/list-share-with-user-row.interface';
import { mapListShareRow } from './map-list-share-row.util';

export function mapListShareWithUserRow(row: ListShareWithUserRow): ListShareWithUser {
  return {
    ...mapListShareRow(row),
    Username: row.Username,
    FirstName: row.FirstName,
    LastName: row.LastName,
    Email: row.Email,
    Avatar: row.Avatar ?? null,
  };
}
