import type { User } from '../user.entity';
import type { UserSearchResult } from '@/modules/friends/domain/friend.entity';

export interface CustomTheme {
  Id: string;
  Name: string;
  Colors: Record<string, string>;
  Advanced: Record<string, unknown>;
}

export interface CustomThemeInput {
  id: string;
  name: string;
  colors: Record<string, string>;
  advanced?: Record<string, unknown>;
}

export interface EmailVerificationLookup {
  id: string;
  emailVerificationExpires: Date;
}

export interface TwoFactorSecrets {
  twoFactorSecret: string | null;
  twoFactorRecoveryCodes: string | null;
}

export interface AdminAccountStatus {
  id: string;
  isAdmin: boolean;
  isDisabled: boolean;
}

export interface DeleteAccountStatus extends AdminAccountStatus {
  authHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(username: string, email: string, firstName: string, lastName: string, authHash: string, isAdmin?: boolean, isOwner?: boolean): Promise<User>;
  update(id: string, updates: {
    username?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    theme?: string;
    avatar?: string | null;
    birthday?: string | null;
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: Date | null;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string | null;
    twoFactorRecoveryCodes?: string | null;
    aiEnabled?: boolean;
    webSearchEnabled?: boolean;
  }): Promise<User>;
  count(): Promise<number>;
  updateLastOnline(id: string): Promise<void>;
  updateLockout(id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void>;
  resetLockoutAndRecordLogin(id: string): Promise<void>;
  findByEmailVerificationToken(token: string): Promise<EmailVerificationLookup | null>;
  setDefaultUserPolicy(id: string, policyJson: string): Promise<void>;
  countEnabledAdmins(excludeUserId?: string): Promise<number>;
  getAccountStatusForDisable(id: string): Promise<AdminAccountStatus | null>;
  getAccountStatusForDelete(id: string): Promise<DeleteAccountStatus | null>;
  disableAccount(id: string): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  getTwoFactorSecrets(id: string): Promise<TwoFactorSecrets | null>;
  countMutualFriends(viewerId: string, userId: string): Promise<number>;
  listCustomThemes(userId: string): Promise<CustomTheme[]>;
  saveCustomTheme(userId: string, theme: CustomThemeInput): Promise<CustomTheme>;
  deleteCustomTheme(userId: string, themeId: string): Promise<void>;
  searchUsers(query: string, excludeId: string): Promise<UserSearchResult[]>;
  isUserDisabled(userId: string): Promise<boolean | null>;
}
