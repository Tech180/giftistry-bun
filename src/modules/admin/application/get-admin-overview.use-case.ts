import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { ReportRepository } from '../domain/ports/report.repository';
import type { AuditLogRepository } from '@/common/domain/ports/audit-log.repository';
import { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';

export class GetAdminOverviewUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private reportRepo: ReportRepository,
    private auditLogRepo: AuditLogRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute() {
    const [users, lists, commentCount, openReports, recentAudit, sitePolicy] = await Promise.all([
      this.adminUserRepo.getOverviewUserStats(),
      this.adminUserRepo.getOverviewListStats(),
      this.adminUserRepo.getOverviewCommentCount(),
      this.reportRepo.getOpenCount(),
      this.auditLogRepo.listRecent(10),
      this.getSitePolicy.execute(),
    ]);

    return {
      Stats: {
        Users: users,
        Lists: lists,
        Comments: commentCount,
        OpenReports: openReports,
        MaintenanceMode: sitePolicy.MaintenanceMode,
      },
      RecentAudit: recentAudit,
    };
  }
}
