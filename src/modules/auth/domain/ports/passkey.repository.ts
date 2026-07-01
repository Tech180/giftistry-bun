import type { UserPasskey } from '../passkey.entity';

export interface PasskeyRepository {
  findById(id: string): Promise<UserPasskey | null>;
  findByUserId(userId: string): Promise<UserPasskey[]>;
  findByCredentialId(credentialId: string): Promise<UserPasskey | null>;
  create(userId: string, credentialId: string, publicKey: string, counter: number, backedUp: boolean, transports: string[]): Promise<UserPasskey>;
  updateCounter(credentialId: string, counter: number): Promise<void>;
  delete(id: string): Promise<void>;
}
