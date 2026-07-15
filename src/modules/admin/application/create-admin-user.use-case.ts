import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { AppError } from '@/common/middlewares/error.middleware';
import { generateAvatarColor } from '@/common/utils/avatar.util';

export interface CreateAdminUserPayload {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
  forcePasswordChange?: boolean;
  policy?: Record<string, unknown>;
}

export class CreateAdminUserUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, payload: CreateAdminUserPayload, ip?: string | null) {
    if (!payload.username || !payload.email || !payload.password) {
      throw new AppError('Username, email, and password are required', 400, 'BAD_REQUEST');
    }

    const exists = await this.adminUserRepo.existsByUsernameOrEmail(payload.username, payload.email);
    if (exists) {
      throw new AppError('User with this username or email already exists', 409, 'USER_EXISTS');
    }

    const sitePolicy = await this.getSitePolicy.execute();
    const authHash = await Bun.password.hash(payload.password);
    const avatar = generateAvatarColor();
    const policy = mergeUserPolicy(payload.policy ?? sitePolicy.DefaultUserPolicy);

    const userId = await this.adminUserRepo.create(
      {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        isAdmin: payload.isAdmin,
        emailVerified: payload.emailVerified,
        forcePasswordChange: payload.forcePasswordChange,
        policy,
      },
      authHash,
      avatar
    );

    await this.writeAuditLog.execute({
      actorId,
      targetId: userId,
      action: 'admin.user.create',
      metadata: { username: payload.username, isAdmin: !!payload.isAdmin },
      ip,
    });

    return { UserId: userId };
  }
}
