import type { UserRepository } from '../domain/ports/user.repository';
import type { EmailSender } from '../domain/ports/email-sender.port';
import type { SafeUser } from '../domain/user.entity';
import { toSafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { mergeUserPolicy } from '@/common/types/user-policy';

export class SignupUseCase {
  constructor(
    private userRepo: UserRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private emailSender: EmailSender
  ) {}

  async execute(
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<SafeUser> {
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required', 400, 'BAD_REQUEST');
    }

    const sitePolicy = await this.getSitePolicy.execute();
    if (sitePolicy.RegistrationMode === 'disabled') {
      throw new AppError('Registration is currently disabled', 403, 'FORBIDDEN');
    }

    if (sitePolicy.AllowedEmailDomains.length > 0) {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain || !sitePolicy.AllowedEmailDomains.map((d) => d.toLowerCase()).includes(domain)) {
        throw new AppError('Registration is restricted to approved email domains', 403, 'FORBIDDEN');
      }
    }

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
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
    const user = await this.userRepo.create(username, email, firstName || '', lastName || '', authHash, isAdmin, isOwner);

    await this.userRepo.setDefaultUserPolicy(user.Id, JSON.stringify(mergeUserPolicy(sitePolicy.DefaultUserPolicy)));

    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepo.update(user.Id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expiresAt,
    });

    this.emailSender.sendVerificationEmail(user.Email, user.Username, verificationToken).catch(console.error);

    return toSafeUser(user);
  }
}
