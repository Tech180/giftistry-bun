export interface UserPasskeyRow {
  Id: string;
  UserId: string;
  CredentialId: string;
  PublicKey: string;
  Counter: number | string;
  BackedUp: boolean;
  Transports: string | null;
}
