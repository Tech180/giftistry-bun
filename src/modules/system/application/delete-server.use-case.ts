import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export class DeleteServerUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, actorUsername: string, ip: string | null): Promise<void> {
    const isOwner = await this.serverConfigRepo.isUserOwner(actorId);
    if (!isOwner) {
      throw new AppError('Only the server owner can delete this server', 403, 'FORBIDDEN');
    }

    await this.writeAuditLog.execute({
      actorId,
      action: 'system.delete_server',
      metadata: { initiatedBy: actorUsername },
      ip,
    });

    await this.serverConfigRepo.deleteAllServerData();
  }
}
