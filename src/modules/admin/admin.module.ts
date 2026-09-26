import { Elysia } from 'elysia';
import type { AdminModuleDeps } from './interfaces/admin-module-deps.interface';
import { GetAdminOverviewUseCase } from './slices/audit/use-cases/get-admin-overview.use-case';
import { ListAdminUsersUseCase } from './slices/users/use-cases/list-admin-users.use-case';
import { GetAdminUserUseCase } from './slices/users/use-cases/get-admin-user.use-case';
import { CreateAdminUserUseCase } from './slices/users/use-cases/create-admin-user.use-case';
import { UpdateAdminUserUseCase } from './slices/users/use-cases/update-admin-user.use-case';
import { UpdateUserPolicyUseCase } from './slices/policy/use-cases/update-user-policy.use-case';
import { ResetUserPasswordUseCase } from './slices/users/use-cases/reset-user-password.use-case';
import { UnlockUserUseCase } from './slices/users/use-cases/unlock-user.use-case';
import { RevokeUserSessionsUseCase } from './slices/users/use-cases/revoke-user-sessions.use-case';
import { DeleteAdminUserUseCase } from './slices/users/use-cases/delete-admin-user.use-case';
import { GetSitePolicyAdminUseCase } from './slices/policy/use-cases/get-site-policy-admin.use-case';
import { SaveSitePolicyAdminUseCase } from './slices/policy/use-cases/save-site-policy-admin.use-case';
import { ListAuditLogUseCase } from './slices/audit/use-cases/list-audit-log.use-case';
import { ModerateCommentUseCase } from './slices/moderation/use-cases/moderate-comment.use-case';
import { HandleReportUseCase } from './slices/reports/use-cases/handle-report.use-case';
import { CreateReportUseCase } from './slices/reports/use-cases/create-report.use-case';
import { createAdminAuthMiddleware } from './presentation/middlewares/admin-auth.middleware';
import { adminRoutes } from './presentation/admin.routes';
import { reportsRoutes } from './presentation/reports.routes';

export type { AdminModuleDeps } from './interfaces/admin-module-deps.interface';

export function createAdminModule(deps: AdminModuleDeps) {
  const createReport = new CreateReportUseCase(deps.reportRepo);
  const adminAuth = createAdminAuthMiddleware(deps.authMiddleware);

  return new Elysia()
    .use(reportsRoutes({ createReport, authMiddleware: deps.authMiddleware }))
    .use(
      adminRoutes(
        {
          getOverview: new GetAdminOverviewUseCase(
            deps.userRepo,
            deps.reportRepo,
            deps.auditLogRepo,
            deps.getSitePolicyUseCase
          ),
          listUsers: new ListAdminUsersUseCase(deps.userRepo),
          getUser: new GetAdminUserUseCase(deps.userRepo),
          createUser: new CreateAdminUserUseCase(
            deps.userRepo,
            deps.getSitePolicyUseCase,
            deps.writeAuditLogUseCase
          ),
          updateUser: new UpdateAdminUserUseCase(deps.userRepo, deps.writeAuditLogUseCase),
          updateUserPolicy: new UpdateUserPolicyUseCase(deps.userRepo, deps.writeAuditLogUseCase),
          resetPassword: new ResetUserPasswordUseCase(
            deps.userRepo,
            deps.writeAuditLogUseCase,
            deps.getSitePolicyUseCase
          ),
          unlockUser: new UnlockUserUseCase(deps.userRepo, deps.writeAuditLogUseCase),
          revokeSessions: new RevokeUserSessionsUseCase(deps.userRepo, deps.writeAuditLogUseCase),
          deleteUser: new DeleteAdminUserUseCase(deps.userRepo, deps.writeAuditLogUseCase),
          getSitePolicy: new GetSitePolicyAdminUseCase(deps.getSitePolicyUseCase),
          saveSitePolicy: new SaveSitePolicyAdminUseCase(
            deps.saveSitePolicyUseCase,
            deps.writeAuditLogUseCase
          ),
          listAuditLog: new ListAuditLogUseCase(deps.auditLogRepo),
          moderateComment: new ModerateCommentUseCase(
            deps.moderationRepo,
            deps.writeAuditLogUseCase
          ),
          handleReport: new HandleReportUseCase(deps.reportRepo, deps.writeAuditLogUseCase),
        },
        adminAuth
      )
    );
}
