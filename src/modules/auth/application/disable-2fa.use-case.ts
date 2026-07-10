import { verify } from 'otplib';
import type { UserRepository } from '../domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class Disable2faUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, code: string): Promise<void> {
    const secrets = await this.userRepo.getTwoFactorSecrets(userId);
    if (!secrets || !secrets.twoFactorSecret) {
      throw new AppError('2FA is not enabled', 400, 'BAD_REQUEST');
    }

    let isVerified = false;
    if (code.trim().length === 6) {
      try {
        isVerified = (await verify({ token: code, secret: secrets.twoFactorSecret })).valid;
      } catch {
        // Ignore
      }
    }

    if (!isVerified && secrets.twoFactorRecoveryCodes) {
      const codes = secrets.twoFactorRecoveryCodes.split(',');
      isVerified = codes.some((c) => c.toUpperCase() === code.toUpperCase().trim());
    }

    if (!isVerified) {
      throw new AppError('Invalid 2FA verification code', 400, 'BAD_REQUEST');
    }

    await this.userRepo.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
    });
  }
}
