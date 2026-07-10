import type { PasskeyRepository } from '../domain/ports/passkey.repository';

export class ListPasskeysUseCase {
  constructor(private passkeyRepo: PasskeyRepository) {}

  async execute(userId: string) {
    const passkeys = await this.passkeyRepo.findByUserId(userId);
    return passkeys.map((pk) => ({
      Id: pk.Id,
      CredentialId: pk.CredentialId,
      Counter: pk.Counter,
      BackedUp: pk.BackedUp,
      Transports: pk.Transports,
    }));
  }
}
