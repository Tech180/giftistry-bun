import type { UserListItemDto } from '../interfaces/user-list-item-dto.interface';
import type { UserListRow } from '../interfaces/user-list-row.interface';

export function mapUserListItem(row: UserListRow): UserListItemDto {
  return {
    Id: row.Id,
    Username: row.Username,
    Email: row.Email,
    IsOwner: !!row.IsOwner,
    IsAdmin: !!row.IsAdmin,
    IsDisabled: !!row.IsDisabled,
    LockedUntil: row.LockedUntil ?? null,
    ActiveListsCount: row.ActiveListsCount ?? 0,
    LastLoginAt: row.LastLoginAt ?? null,
    LastOnline: row.LastOnline ?? null,
  };
}
