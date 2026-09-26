/** Fields needed by the users table — not a full UserDto. */
export interface UserListItemDto {
  Id: string;
  Username: string;
  Email: string;
  IsOwner: boolean;
  IsAdmin: boolean;
  IsDisabled: boolean;
  LockedUntil: Date | string | null;
  ActiveListsCount: number;
  LastLoginAt: Date | string | null;
  LastOnline: Date | string | null;
}
