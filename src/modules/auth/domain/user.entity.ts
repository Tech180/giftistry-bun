export interface User {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  AuthHash: string;
  CreatedAt?: Date;
  Bio?: string;
  Theme?: string;
  Avatar?: string | null;
  EmailVerified?: boolean;
  TwoFactorEnabled?: boolean;
  TwoFactorRecoveryCodes?: string | null;
  IsAdmin?: boolean;
}
