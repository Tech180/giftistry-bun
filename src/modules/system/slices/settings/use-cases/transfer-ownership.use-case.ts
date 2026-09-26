import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';

export class TransferOwnershipUseCase {
  constructor(
    private serverConfigRepo: ServerConfigRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(
    actorId: string,
    targetUserId: string,
    ip: string | null
  ): Promise<{ NewOwnerId: string; NewOwnerUsername: string }> {
    const isOwner = await this.serverConfigRepo.isUserOwner(actorId);
    if (!isOwner) {
      throw new AppError(
        'Only the server owner can transfer ownership',
        DOMAIN_ERROR_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const trimmedTargetUserId = targetUserId?.trim();
    if (!trimmedTargetUserId) {
      throw new AppError(
        'Target user is required',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    if (trimmedTargetUserId === actorId) {
      throw new AppError(
        'You cannot transfer ownership to yourself',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    const target = await this.serverConfigRepo.findTransferTarget(trimmedTargetUserId);
    if (!target) {
      throw new AppError('User not found', DOMAIN_ERROR_STATUS.NOT_FOUND, 'NOT_FOUND');
    }
    if (target.isDisabled) {
      throw new AppError(
        'Cannot transfer ownership to a disabled account',
        DOMAIN_ERROR_STATUS.BAD_REQUEST,
        'BAD_REQUEST'
      );
    }

    await this.serverConfigRepo.transferOwnership(actorId, trimmedTargetUserId);

    await this.writeAuditLog.execute({
      actorId,
      targetId: trimmedTargetUserId,
      action: 'system.transfer_ownership',
      metadata: { newOwnerUsername: target.username },
      ip,
    });

    return {
      NewOwnerId: trimmedTargetUserId,
      NewOwnerUsername: target.username,
    };
  }
}
