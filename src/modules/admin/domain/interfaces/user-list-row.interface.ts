export interface UserListRow {
  Id: string;
  Username: string;
  Email: string;
  IsOwner?: boolean;
  IsAdmin?: boolean;
  IsDisabled?: boolean;
  LockedUntil?: Date | string | null;
  ActiveListsCount?: number;
  LastLoginAt?: Date | string | null;
  LastOnline?: Date | string | null;
}
