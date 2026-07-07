import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { getSitePolicy } from '@/common/services/site-policy.service';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { sql } from '@/common/database/connection';

export class SignupUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(username: string, email: string, password: string, firstName?: string, lastName?: string): Promise<Omit<User, 'AuthHash'>> {
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required', 400, 'BAD_REQUEST');
    }

    const sitePolicy = await getSitePolicy();
    if (sitePolicy.registrationMode === 'disabled') {
      throw new AppError('Registration is currently disabled', 403, 'FORBIDDEN');
    }

    if (sitePolicy.allowedEmailDomains.length > 0) {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain || !sitePolicy.allowedEmailDomains.map((d) => d.toLowerCase()).includes(domain)) {
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

    await sql`
      UPDATE users SET policy_json = ${JSON.stringify(mergeUserPolicy(sitePolicy.defaultUserPolicy))}::jsonb
      WHERE id = ${user.Id}
    `;

    const { AuthHash: _authHash, ...safeUser } = user;
    return safeUser;
  }
}
