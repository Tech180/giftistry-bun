import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { ListShare, ShareRole } from '../domain/list-share.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class UpdateListShareUseCase {
  constructor(private listShareRepo: ListShareRepository) {}

  async execute(listId: string, shareId: string, role: ShareRole): Promise<ListShare> {
    if (role !== 'viewer' && role !== 'collaborator') {
      throw new AppError('Invalid role. Role must be either viewer or collaborator', 400, 'BAD_REQUEST');
    }

    const share = await this.listShareRepo.findShareById(shareId);
    if (!share || share.ListId !== listId) {
      throw new AppError('Share not found', 404, 'NOT_FOUND');
    }

    return await this.listShareRepo.updateShareRole(shareId, role);
  }
}
