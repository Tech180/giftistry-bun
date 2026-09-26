export interface UserUpdateInput {
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
  isAdmin?: boolean;
  aiEnabled?: boolean;
  webSearchEnabled?: boolean;
  isOnboarded?: boolean;
}
