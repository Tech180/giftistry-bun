import type { GetAdminOverviewUseCase } from '../../slices/audit/use-cases/get-admin-overview.use-case';
import type { ListAdminUsersUseCase } from '../../slices/users/use-cases/list-admin-users.use-case';
import type { GetAdminUserUseCase } from '../../slices/users/use-cases/get-admin-user.use-case';
import type { CreateAdminUserUseCase } from '../../slices/users/use-cases/create-admin-user.use-case';
import type { UpdateAdminUserUseCase } from '../../slices/users/use-cases/update-admin-user.use-case';
import type { UpdateUserPolicyUseCase } from '../../slices/policy/use-cases/update-user-policy.use-case';
import type { ResetUserPasswordUseCase } from '../../slices/users/use-cases/reset-user-password.use-case';
import type { UnlockUserUseCase } from '../../slices/users/use-cases/unlock-user.use-case';
import type { RevokeUserSessionsUseCase } from '../../slices/users/use-cases/revoke-user-sessions.use-case';
import type { DeleteAdminUserUseCase } from '../../slices/users/use-cases/delete-admin-user.use-case';
import type { GetSitePolicyAdminUseCase } from '../../slices/policy/use-cases/get-site-policy-admin.use-case';
import type { SaveSitePolicyAdminUseCase } from '../../slices/policy/use-cases/save-site-policy-admin.use-case';
import type { ListAuditLogUseCase } from '../../slices/audit/use-cases/list-audit-log.use-case';
import type { ModerateCommentUseCase } from '../../slices/moderation/use-cases/moderate-comment.use-case';
import type { HandleReportUseCase } from '../../slices/reports/use-cases/handle-report.use-case';

export interface UseCases {
  getOverview: GetAdminOverviewUseCase;
  listUsers: ListAdminUsersUseCase;
  getUser: GetAdminUserUseCase;
  createUser: CreateAdminUserUseCase;
  updateUser: UpdateAdminUserUseCase;
  updateUserPolicy: UpdateUserPolicyUseCase;
  resetPassword: ResetUserPasswordUseCase;
  unlockUser: UnlockUserUseCase;
  revokeSessions: RevokeUserSessionsUseCase;
  deleteUser: DeleteAdminUserUseCase;
  getSitePolicy: GetSitePolicyAdminUseCase;
  saveSitePolicy: SaveSitePolicyAdminUseCase;
  listAuditLog: ListAuditLogUseCase;
  moderateComment: ModerateCommentUseCase;
  handleReport: HandleReportUseCase;
}
