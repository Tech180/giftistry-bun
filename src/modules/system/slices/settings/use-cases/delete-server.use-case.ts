import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';

export class DeleteServerUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, actorUsername: string, ip: string | null): Promise<void> {
    const isOwner = await this.serverConfigRepo.isUserOwner(actorId);
    if (!isOwner) {
      throw new AppError(
        'Only the server owner can delete this server',
        DOMAIN_ERROR_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    await this.writeAuditLog.execute({
      actorId,
      action: 'system.delete_server',
      metadata: { initiatedBy: actorUsername },
      ip,
    });

    await this.serverConfigRepo.deleteAllServerData();

    const config = this.serverConfigRepo.load();
    this.serverConfigRepo.save({
      ...config,
      AllowSetup: true,
    });
  }
}
