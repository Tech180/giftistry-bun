import type { RegistrationInvite } from '../registration-invite.entity';

export interface CreateRegistrationInviteInput {
  tokenHash: string;
  token: string;
  expiresAt: Date;
  maxUses: number | null;
  createdBy: string | null;
}

export interface RegistrationInviteRepository {
  findActive(): Promise<RegistrationInvite | null>;
  findAll(): Promise<RegistrationInvite[]>;
  findById(id: string): Promise<RegistrationInvite | null>;
  findByTokenHash(tokenHash: string): Promise<RegistrationInvite | null>;
  create(input: CreateRegistrationInviteInput): Promise<RegistrationInvite>;
  deleteById(id: string): Promise<boolean>;
  incrementUseCount(id: string): Promise<void>;
}
