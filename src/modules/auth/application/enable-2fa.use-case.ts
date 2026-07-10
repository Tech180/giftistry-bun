import { verify } from 'otplib';
import type { UserRepository } from '../domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class Enable2faUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, secret: string, code: string): Promise<string[]> {
    const isVerified = (await verify({ token: code, secret })).valid;
    if (!isVerified) {
      throw new AppError('Invalid 2FA verification code', 400, 'BAD_REQUEST');
    }

    const recoveryCodesArray = Array.from({ length: 8 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    });
    const recoveryCodesStr = recoveryCodesArray.join(',');

    await this.userRepo.update(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorRecoveryCodes: recoveryCodesStr,
    });

    return recoveryCodesArray;
  }
}
