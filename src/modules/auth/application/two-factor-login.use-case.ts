import type { UserRepository } from '../domain/ports/user.repository';
import type { SafeUser } from '../domain/user.entity';
import { toSafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { createToken, verifyToken } from '@/common/utils/token';
import { verify } from 'otplib';

export class TwoFactorLoginUseCase {
  constructor(private userRepo: UserRepository) {}

  async createTicket(userId: string): Promise<string> {
    return createToken({ userId, action: '2fa_login' }, 300 * 1000);
  }

  async execute(ticket: string, code: string): Promise<SafeUser> {
    const payload = await verifyToken(ticket);
    if (!payload || payload.action !== '2fa_login') {
      throw new AppError('Invalid or expired 2FA login session', 400, 'BAD_REQUEST');
    }

    const user = await this.userRepo.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const secrets = await this.userRepo.getTwoFactorSecrets(user.Id);
    if (!secrets || !secrets.twoFactorSecret) {
      throw new AppError('2FA is not set up for this account', 400, 'BAD_REQUEST');
    }

    let isVerified = false;
    if (code.trim().length === 6) {
      try {
        isVerified = (await verify({
          token: code,
          secret: secrets.twoFactorSecret,
        })).valid;
      } catch {
        // Ignore validation errors from otplib for non-6-digit tokens
      }
    }

    if (!isVerified && secrets.twoFactorRecoveryCodes) {
      const codes = secrets.twoFactorRecoveryCodes.split(',');
      const idx = codes.findIndex((c) => c.toUpperCase() === code.toUpperCase().trim());
      if (idx !== -1) {
        isVerified = true;
        codes.splice(idx, 1);
        await this.userRepo.update(user.Id, {
          twoFactorRecoveryCodes: codes.length > 0 ? codes.join(',') : null,
        });
      }
    }

    if (!isVerified) {
      throw new AppError('Invalid 2FA code', 401, 'UNAUTHORIZED');
    }

    return toSafeUser(user);
  }
}
