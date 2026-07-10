import type { UserRepository } from '../domain/ports/user.repository';
import type { SafeUser } from '../domain/user.entity';
import { UserEntity, toSafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';

export class LoginUseCase {
  constructor(
    private userRepo: UserRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(email: string, password: string): Promise<SafeUser> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const sitePolicy = await this.getSitePolicy.execute();
    if (!sitePolicy.allowPasswordLogin) {
      throw new AppError('Password login is disabled on this server', 403, 'FORBIDDEN');
    }

    const userRow = await this.userRepo.findByEmail(email);
    if (!userRow) {
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    const user = UserEntity.from(userRow);
    user.assertCanLogin(sitePolicy);

    const isMatch = await Bun.password.verify(password, user.AuthHash);
    if (!isMatch) {
      const { failedLoginCount, lockedUntil } = user.recordFailedLogin(sitePolicy);
      await this.userRepo.updateLockout(user.Id, failedLoginCount, lockedUntil);
      throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
    }

    await this.userRepo.resetLockoutAndRecordLogin(user.Id);
    return toSafeUser(user.toPlain());
  }
}
