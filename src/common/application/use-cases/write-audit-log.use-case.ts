import type { AuditLogRepository, AuditLogEntry } from '@/common/domain/ports/audit-log.repository';

export class WriteAuditLogUseCase {
  constructor(private auditLogRepo: AuditLogRepository) {}

  async execute(entry: AuditLogEntry): Promise<void> {
    await this.auditLogRepo.write(entry);
  }
}
