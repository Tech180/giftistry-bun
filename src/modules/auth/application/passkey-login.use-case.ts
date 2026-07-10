import type { PasskeyRepository } from '../domain/ports/passkey.repository';
import type { UserRepository } from '../domain/ports/user.repository';
import type { SafeUser } from '../domain/user.entity';
import { toSafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const rpID = 'localhost';

export class PasskeyLoginUseCase {
  constructor(
    private passkeyRepo: PasskeyRepository,
    private userRepo: UserRepository
  ) {}

  async generateOptions(): Promise<{ options: Awaited<ReturnType<typeof generateAuthenticationOptions>>; challenge: string }> {
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [],
      userVerification: 'preferred',
    });
    return { options, challenge: options.challenge };
  }

  async verify(
    authenticationResponse: { id: string },
    challenge: string,
    origin: string
  ): Promise<SafeUser> {
    if (!challenge) {
      throw new AppError('Missing authentication challenge. Please request login options again.', 400, 'BAD_REQUEST');
    }

    const passkey = await this.passkeyRepo.findByCredentialId(authenticationResponse.id);
    if (!passkey) {
      throw new AppError('Passkey not registered on this server', 404, 'NOT_FOUND');
    }

    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.CredentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.PublicKey, 'base64')),
        counter: passkey.Counter,
      },
    });

    if (!verification.verified) {
      throw new AppError('Passkey verification failed', 401, 'UNAUTHORIZED');
    }

    await this.passkeyRepo.updateCounter(passkey.CredentialId, verification.authenticationInfo.newCounter);

    const user = await this.userRepo.findById(passkey.UserId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return toSafeUser(user);
  }
}
