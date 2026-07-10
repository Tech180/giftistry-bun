import type { ReportRepository, ReportStatus } from '../domain/ports/report.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';

export class HandleReportUseCase {
  constructor(
    private reportRepo: ReportRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async list(query: { status?: string; page?: string | number }) {
    const status = query.status ?? 'open';
    const page = Math.max(1, Number(query.page) || 1);
    const result = await this.reportRepo.list(status, page, 25);
    return {
      Reports: result.reports,
      Page: result.page,
      Total: result.total,
    };
  }

  async handle(actorId: string, reportId: string, status: ReportStatus, ip?: string | null) {
    await this.reportRepo.updateStatus(reportId, status, actorId);
    await this.writeAuditLog.execute({
      actorId,
      action: 'admin.report.resolve',
      metadata: { reportId, status },
      ip,
    });
  }
}
