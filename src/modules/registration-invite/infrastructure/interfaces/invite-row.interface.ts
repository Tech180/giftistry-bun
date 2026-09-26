export interface InviteRow {
  Id: string;
  TokenHash: string;
  Token: string | null;
  ExpiresAt: Date | string;
  MaxUses: number | null;
  UseCount: number | null;
  CreatedBy: string | null;
  CreatedAt: Date | string;
  RevokedAt: Date | string | null;
}
