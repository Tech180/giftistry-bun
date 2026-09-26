export interface ListLinkTokenRow {
  Id: string;
  ListId: string;
  TokenHash: string;
  Token: string | null;
  Role: string;
  CreatedBy: string;
  ExpiresAt: Date | string | null;
  MaxUses: number | null;
  UseCount: number;
  RevokedAt: Date | string | null;
  PasswordHash: string | null;
  CreatedAt: Date | string;
}
