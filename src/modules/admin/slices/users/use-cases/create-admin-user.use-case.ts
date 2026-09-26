import type { UserRepository } from '../../../domain/ports/user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';
import { AppError } from '@/common/domain/errors/app-error';
import { validatePasswordPolicy } from '@/common/domain/utils/validate-password-policy.util';
import { validateUsernamePolicy } from '@/common/domain/utils/validate-username-policy.util';
import { generateAvatarColor } from '@/common/utils/avatar.util';
import type { CreateUserPayload } from '../interfaces/create-user-payload.interface';

export class CreateAdminUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, payload: CreateUserPayload, ip?: string | null) {
    if (!payload.username || !payload.password) {
      throw new AppError('Username and password are required', 400, 'BAD_REQUEST');
    }

    const validatedUsername = validateUsernamePolicy(payload.username);
    const email = payload.email?.trim() ? payload.email.trim() : null;

    const sitePolicy = await this.getSitePolicy.execute();
    const forcePasswordChange = !!payload.forcePasswordChange;
    validatePasswordPolicy(payload.password, {
      requireStrong: sitePolicy.RequireStrongPasswords && !forcePasswordChange,
    });

    const exists = await this.userRepo.existsByUsernameOrEmail(validatedUsername, email);
    if (exists) {
      throw new AppError('User with this username or email already exists', 409, 'USER_EXISTS');
    }

    const authHash = await Bun.password.hash(payload.password);
    const avatar = generateAvatarColor();
    const policy = mergeUserPolicy(payload.policy ?? sitePolicy.DefaultUserPolicy);

    const userId = await this.userRepo.create(
      {
        username: validatedUsername,
        email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        isAdmin: payload.isAdmin,
        emailVerified: email ? !!payload.emailVerified : false,
        forcePasswordChange,
        policy,
      },
      authHash,
      avatar
    );

    await this.writeAuditLog.execute({
      actorId,
      targetId: userId,
      action: 'admin.user.create',
      metadata: { username: validatedUsername, isAdmin: !!payload.isAdmin },
      ip,
    });

    return { UserId: userId };
  }
}
