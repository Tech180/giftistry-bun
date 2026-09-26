import type { UserSearchResult } from '@/modules/friends';
import type { UserSearchRow } from '../interfaces/user-search-row.interface';

export function mapUserSearchRow(row: UserSearchRow): UserSearchResult {
  return {
    Id: row.Id,
    Username: row.Username,
    FirstName: row.FirstName,
    LastName: row.LastName,
    Avatar: row.Avatar ?? null,
  };
}
