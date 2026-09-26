import { AppError } from '@/common/domain/errors/app-error';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import type { RegistrationInviteRepository } from '../../domain/ports/registration-invite.repository';

export class DeleteRegistrationInviteUseCase {
  constructor(
    private inviteRepo: RegistrationInviteRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, inviteId: string, ip?: string | null): Promise<void> {
    const existing = await this.inviteRepo.findById(inviteId);
    if (!existing) {
      throw new AppError('Registration invite not found', 404, 'NOT_FOUND');
    }

    const deleted = await this.inviteRepo.deleteById(inviteId);
    if (!deleted) {
      throw new AppError('Registration invite not found', 404, 'NOT_FOUND');
    }

    await this.writeAuditLog.execute({
      actorId,
      targetId: null,
      action: 'admin.registration_invite.delete',
      metadata: {
        InviteId: inviteId,
        ExpiresAt: existing.ExpiresAt.toISOString(),
        UseCount: existing.UseCount,
        MaxUses: existing.MaxUses,
      },
      ip,
    });
  }
}
