export interface UserPasskey {
  Id: string;
  UserId: string;
  CredentialId: string;
  PublicKey: string;
  Counter: number;
  BackedUp: boolean;
  Transports: string[];
}
