import type { UserRepository } from '../../../domain/ports/user.repository';
import type { SafeUser } from '../../../domain/types/safe-user.type';
import { toSafeUser } from '../../../domain/utils/to-safe-user.util';
import { AppError } from '@/common/domain/errors/app-error';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { RegistrationInviteRepository } from '@/modules/registration-invite';
import {
  consumeRegistrationInvite,
  loadValidRegistrationInvite,
} from '@/modules/registration-invite';
import { validatePasswordPolicy } from '@/common/domain/utils/validate-password-policy.util';
import { validateUsernamePolicy } from '@/common/domain/utils/validate-username-policy.util';
import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';

export class SignupUseCase {
  constructor(
    private userRepo: UserRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private registrationInviteRepo: RegistrationInviteRepository
  ) {}

  async execute(
    username: string,
    email: string | null | undefined,
    password: string,
    firstName?: string,
    lastName?: string,
    inviteToken?: string | null
  ): Promise<SafeUser> {
    if (!username || !password) {
      throw new AppError('Username and password are required', 400, 'BAD_REQUEST');
    }

    const validatedUsername = validateUsernamePolicy(username);

    const sitePolicy = await this.getSitePolicy.execute();
    validatePasswordPolicy(password, { requireStrong: sitePolicy.RequireStrongPasswords });

    const normalizedEmail = email?.trim() ? email.trim() : null;

    if (sitePolicy.RegistrationMode === 'disabled') {
      throw new AppError('Registration is currently disabled', 403, 'FORBIDDEN');
    }

    let inviteToConsume = null;
    if (sitePolicy.RegistrationMode === 'invite_only') {
      inviteToConsume = await loadValidRegistrationInvite(
        this.registrationInviteRepo,
        inviteToken
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

    const existingUsername = await this.userRepo.findByUsername(validatedUsername);
    if (existingUsername) {
      throw new AppError('User with this username already exists', 409, 'USER_EXISTS');
    }

    const userCount = await this.userRepo.count();
    const isFirstUser = userCount === 0;
    const isAdmin = isFirstUser;
    const isOwner = isFirstUser;

    const authHash = await Bun.password.hash(password);
    const user = await this.userRepo.create(
      validatedUsername,
      normalizedEmail,
      firstName || '',
      lastName || '',
      authHash,
      isAdmin,
      isOwner
    );

    await this.userRepo.setDefaultUserPolicy(user.Id, JSON.stringify(mergeUserPolicy(sitePolicy.DefaultUserPolicy)));

    if (inviteToConsume) {
      await consumeRegistrationInvite(this.registrationInviteRepo, inviteToConsume);
    }

    return toSafeUser(user);
  }
}
