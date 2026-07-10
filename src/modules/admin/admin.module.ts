import { Elysia } from 'elysia';
import type { AdminUserRepository } from './domain/ports/admin-user.repository';
import type { ModerationRepository } from './domain/ports/moderation.repository';
import type { ReportRepository } from './domain/ports/report.repository';
import type { AuditLogRepository } from '@/common/domain/ports/audit-log.repository';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { GetAdminOverviewUseCase } from './application/get-admin-overview.use-case';
import { ListAdminUsersUseCase } from './application/list-admin-users.use-case';
import { GetAdminUserUseCase } from './application/get-admin-user.use-case';
import { CreateAdminUserUseCase } from './application/create-admin-user.use-case';
import { UpdateAdminUserUseCase } from './application/update-admin-user.use-case';
import { UpdateUserPolicyUseCase } from './application/update-user-policy.use-case';
import { ResetUserPasswordUseCase } from './application/reset-user-password.use-case';
import { UnlockUserUseCase } from './application/unlock-user.use-case';
import { RevokeUserSessionsUseCase } from './application/revoke-user-sessions.use-case';
import { DeleteAdminUserUseCase } from './application/delete-admin-user.use-case';
import { GetSitePolicyAdminUseCase } from './application/get-site-policy-admin.use-case';
import { SaveSitePolicyAdminUseCase } from './application/save-site-policy-admin.use-case';
import { ListAuditLogUseCase } from './application/list-audit-log.use-case';
import { ModerateCommentUseCase } from './application/moderate-comment.use-case';
import { HandleReportUseCase } from './application/handle-report.use-case';
import { adminRoutes } from './presentation/admin.routes';

export interface AdminModuleDeps {
  adminUserRepo: AdminUserRepository;
  moderationRepo: ModerationRepository;
  reportRepo: ReportRepository;
  auditLogRepo: AuditLogRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  saveSitePolicyUseCase: SaveSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
}

export function createAdminModule(deps: AdminModuleDeps) {
  return new Elysia().use(adminRoutes({
    getOverview: new GetAdminOverviewUseCase(
      deps.adminUserRepo,
      deps.reportRepo,
      deps.auditLogRepo,
      deps.getSitePolicyUseCase
    ),
    listUsers: new ListAdminUsersUseCase(deps.adminUserRepo),
    getUser: new GetAdminUserUseCase(deps.adminUserRepo),
    createUser: new CreateAdminUserUseCase(
      deps.adminUserRepo,
      deps.getSitePolicyUseCase,
      deps.writeAuditLogUseCase
    ),
    updateUser: new UpdateAdminUserUseCase(deps.adminUserRepo, deps.writeAuditLogUseCase),
    updateUserPolicy: new UpdateUserPolicyUseCase(deps.adminUserRepo, deps.writeAuditLogUseCase),
    resetPassword: new ResetUserPasswordUseCase(deps.adminUserRepo, deps.writeAuditLogUseCase),
    unlockUser: new UnlockUserUseCase(deps.adminUserRepo, deps.writeAuditLogUseCase),
    revokeSessions: new RevokeUserSessionsUseCase(deps.adminUserRepo, deps.writeAuditLogUseCase),
    deleteUser: new DeleteAdminUserUseCase(deps.adminUserRepo, deps.writeAuditLogUseCase),
    getSitePolicy: new GetSitePolicyAdminUseCase(deps.getSitePolicyUseCase),
    saveSitePolicy: new SaveSitePolicyAdminUseCase(deps.saveSitePolicyUseCase, deps.writeAuditLogUseCase),
    listAuditLog: new ListAuditLogUseCase(deps.auditLogRepo),
    moderateComment: new ModerateCommentUseCase(deps.moderationRepo, deps.writeAuditLogUseCase),
    handleReport: new HandleReportUseCase(deps.reportRepo, deps.writeAuditLogUseCase),
  }));
}
