import type { UserRepository } from '../domain/ports/user.repository';
import type { SafeUser } from '../domain/user.entity';
import { toSafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { validatePasswordPolicy } from '@/common/domain/password-policy';
import { mergeUserPolicy } from '@/common/types/user-policy';

export class SignupUseCase {
  constructor(
    private userRepo: UserRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(
    username: string,
    email: string | null | undefined,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<SafeUser> {
    if (!username || !password) {
      throw new AppError('Username and password are required', 400, 'BAD_REQUEST');
    }

    const sitePolicy = await this.getSitePolicy.execute();
    validatePasswordPolicy(password, { requireStrong: sitePolicy.RequireStrongPasswords });

    const normalizedEmail = email?.trim() ? email.trim() : null;

    if (sitePolicy.RegistrationMode === 'disabled') {
      throw new AppError('Registration is currently disabled', 403, 'FORBIDDEN');
    }

    if (sitePolicy.RegistrationMode === 'invite_only') {
      throw new AppError(
        'Registration is invite-only. Contact an administrator for access.',
        403,
        'FORBIDDEN'
      );
    }

    if (sitePolicy.AllowedEmailDomains.length > 0) {
      if (!normalizedEmail) {
        throw new AppError('An email address is required for registration on this server', 400, 'BAD_REQUEST');
      }
      const domain = normalizedEmail.split('@')[1]?.toLowerCase();
      if (!domain || !sitePolicy.AllowedEmailDomains.map((d) => d.toLowerCase()).includes(domain)) {
        throw new AppError('Registration is restricted to approved email domains', 403, 'FORBIDDEN');
      }
    }

    if (normalizedEmail) {
      const existingEmail = await this.userRepo.findByEmail(normalizedEmail);
      if (existingEmail) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }
    }

    const existingUsername = await this.userRepo.findByUsername(username);
    if (existingUsername) {
      throw new AppError('User with this username already exists', 409, 'USER_EXISTS');
    }

    const userCount = await this.userRepo.count();
    const isFirstUser = userCount === 0;
    const isAdmin = isFirstUser;
    const isOwner = isFirstUser;

    const authHash = await Bun.password.hash(password);
    const user = await this.userRepo.create(
      username,
      normalizedEmail,
      firstName || '',
      lastName || '',
      authHash,
      isAdmin,
      isOwner
    );

    await this.userRepo.setDefaultUserPolicy(user.Id, JSON.stringify(mergeUserPolicy(sitePolicy.DefaultUserPolicy)));

    return toSafeUser(user);
  }
}
