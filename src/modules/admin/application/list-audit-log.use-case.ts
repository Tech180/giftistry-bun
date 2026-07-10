import type { AuditLogRepository } from '@/common/domain/ports/audit-log.repository';

export class ListAuditLogUseCase {
  constructor(private auditLogRepo: AuditLogRepository) {}

  async execute(query: { page?: string | number; action?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const action = query.action?.trim() ?? '';
    const result = await this.auditLogRepo.list(page, 50, action);

    return {
      Entries: result.entries,
      Page: result.page,
      Total: result.total,
    };
  }
}
