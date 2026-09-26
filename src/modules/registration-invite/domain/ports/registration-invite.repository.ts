import type { CreateRegistrationInviteInput } from '../interfaces/create-registration-invite-input.interface';
import type { RegistrationInvite } from '../interfaces/registration-invite.interface';

export interface RegistrationInviteRepository {
  findActive(): Promise<RegistrationInvite | null>;
  findAll(): Promise<RegistrationInvite[]>;
  findById(id: string): Promise<RegistrationInvite | null>;
  findByTokenHash(tokenHash: string): Promise<RegistrationInvite | null>;
  create(input: CreateRegistrationInviteInput): Promise<RegistrationInvite>;
  deleteById(id: string): Promise<boolean>;
  incrementUseCount(id: string): Promise<void>;
}
