import type { PasskeyRepository } from '../domain/ports/passkey.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const rpName = 'Giftistry';
const rpID = 'localhost';

export class RegisterPasskeyUseCase {
  constructor(private passkeyRepo: PasskeyRepository) {}

  async generateOptions(userId: string, username: string, firstName: string, lastName: string): Promise<{
    options: Awaited<ReturnType<typeof generateRegistrationOptions>>;
    challenge: string;
  }> {
    const userPasskeys = await this.passkeyRepo.findByUserId(userId);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userId),
      userName: username,
      userDisplayName: `${firstName} ${lastName}`.trim() || username,
      excludeCredentials: userPasskeys.map((pk) => ({
        id: pk.CredentialId,
        type: 'public-key' as const,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    return { options, challenge: options.challenge };
  }

  async verify(
    userId: string,
    registrationResponse: unknown,
    challenge: string,
    origin: string
  ): Promise<void> {
    if (!challenge) {
      throw new AppError('Missing registration challenge. Please request options again.', 400, 'BAD_REQUEST');
    }

    const verification = await verifyRegistrationResponse({
      response: registrationResponse as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new AppError('Registration verification failed', 400, 'BAD_REQUEST');
    }

    const { id, publicKey, counter, transports } = verification.registrationInfo.credential;
    const pubKeyBase64 = Buffer.from(publicKey).toString('base64');

    await this.passkeyRepo.create(
      userId,
      id,
      pubKeyBase64,
      counter,
      verification.registrationInfo.credentialBackedUp || false,
      transports || []
    );
  }
}
