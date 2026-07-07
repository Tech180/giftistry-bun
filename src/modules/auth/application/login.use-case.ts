import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { getSitePolicy } from '@/common/services/site-policy.service';
import { sql } from '@/common/database/connection';

export class LoginUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(email: string, password: string): Promise<Omit<User, 'AuthHash'>> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const sitePolicy = await getSitePolicy();
    if (!sitePolicy.allowPasswordLogin) {
      throw new AppError('Password login is disabled on this server', 403, 'FORBIDDEN');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    if (user.IsDisabled) {
      throw new AppError('This account has been disabled', 403, 'FORBIDDEN');
    }

    if (user.LockedUntil && user.LockedUntil > new Date()) {
      throw new AppError('This account is temporarily locked. Please try again later.', 403, 'FORBIDDEN');
    }

    if (sitePolicy.maintenanceMode && !user.IsAdmin) {
      throw new AppError(sitePolicy.maintenanceMessage || 'Server is in maintenance mode', 503, 'MAINTENANCE');
    }

    if (sitePolicy.requireEmailVerification && !user.EmailVerified && !user.IsAdmin) {
      throw new AppError('Please verify your email before logging in', 403, 'FORBIDDEN');
    }

    const isMatch = await Bun.password.verify(password, user.AuthHash);
    if (!isMatch) {
      const lockoutLimit = user.LoginAttemptsBeforeLockout && user.LoginAttemptsBeforeLockout > 0
        ? user.LoginAttemptsBeforeLockout
        : sitePolicy.loginAttemptsBeforeLockout;

      const nextCount = (user.FailedLoginCount ?? 0) + 1;
      let lockedUntil: Date | null = null;
      if (lockoutLimit > 0 && nextCount >= lockoutLimit) {
        if (sitePolicy.lockoutDurationMinutes > 0) {
          lockedUntil = new Date(Date.now() + sitePolicy.lockoutDurationMinutes * 60 * 1000);
        } else {
          lockedUntil = new Date('2099-01-01');
        }
      }

      await sql`
        UPDATE users SET failed_login_count = ${nextCount}, locked_until = ${lockedUntil}
        WHERE id = ${user.Id}
      `;

      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    await sql`
      UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP
      WHERE id = ${user.Id}
    `;

    const { AuthHash: _authHash, ...safeUser } = user;
    return safeUser;
  }
}
