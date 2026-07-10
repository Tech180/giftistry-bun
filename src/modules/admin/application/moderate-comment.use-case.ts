import type { ModerationRepository } from '../domain/ports/moderation.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';

export class ModerateCommentUseCase {
  constructor(
    private moderationRepo: ModerationRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async list(query: { page?: string | number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const result = await this.moderationRepo.listComments(page, 25);
    return {
      Comments: result.comments,
      Page: result.page,
      Total: result.total,
    };
  }

  async delete(actorId: string, commentId: string, ip?: string | null) {
    await this.moderationRepo.softDeleteComment(commentId);
    await this.writeAuditLog.execute({
      actorId,
      action: 'admin.moderation.comment_delete',
      metadata: { commentId },
      ip,
    });
  }
}
