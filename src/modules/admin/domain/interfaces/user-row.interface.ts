export interface UserRow {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Bio?: string | null;
  Avatar?: string | null;
  CreatedAt: Date | string;
  LastOnline?: Date | string | null;
  LastLoginAt?: Date | string | null;
  EmailVerified?: boolean;
  TwoFactorEnabled?: boolean;
  IsAdmin?: boolean;
  IsOwner?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | string | null;
  FailedLoginCount?: number;
  ForcePasswordChange?: boolean;
  LoginAttemptsBeforeLockout?: number;
  SessionVersion?: number;
  PolicyJson?: unknown;
  WishlistCount?: number;
  ActiveListsCount?: number;
  FriendsCount?: number;
  CommentsCount?: number;
  PasskeyCount?: number;
}
