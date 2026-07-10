import type { GetAdminOverviewUseCase } from '../application/get-admin-overview.use-case';
import type { ListAdminUsersUseCase } from '../application/list-admin-users.use-case';
import type { GetAdminUserUseCase } from '../application/get-admin-user.use-case';
import type { CreateAdminUserUseCase } from '../application/create-admin-user.use-case';
import type { UpdateAdminUserUseCase } from '../application/update-admin-user.use-case';
import type { UpdateUserPolicyUseCase } from '../application/update-user-policy.use-case';
import type { ResetUserPasswordUseCase } from '../application/reset-user-password.use-case';
import type { UnlockUserUseCase } from '../application/unlock-user.use-case';
import type { RevokeUserSessionsUseCase } from '../application/revoke-user-sessions.use-case';
import type { DeleteAdminUserUseCase } from '../application/delete-admin-user.use-case';
import type { GetSitePolicyAdminUseCase } from '../application/get-site-policy-admin.use-case';
import type { SaveSitePolicyAdminUseCase } from '../application/save-site-policy-admin.use-case';
import type { ListAuditLogUseCase } from '../application/list-audit-log.use-case';
import type { ModerateCommentUseCase } from '../application/moderate-comment.use-case';
import type { HandleReportUseCase } from '../application/handle-report.use-case';

export interface AdminUseCases {
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
