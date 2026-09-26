export interface RegistrationInvite {
  Id: string;
  TokenHash: string;
  Token: string | null;
  ExpiresAt: Date;
  MaxUses: number | null;
  UseCount: number;
  CreatedBy: string | null;
  CreatedAt: Date;
  RevokedAt: Date | null;
}
