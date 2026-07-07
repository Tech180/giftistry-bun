import type { ListShareRepository } from '../domain/ports/list-share.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class RemoveListShareUseCase {
  constructor(private listShareRepo: ListShareRepository) {}

  async execute(listId: string, shareId: string): Promise<void> {
    const share = await this.listShareRepo.findShareById(shareId);
    if (!share || share.ListId !== listId) {
      throw new AppError('Share not found', 404, 'NOT_FOUND');
    }

    await this.listShareRepo.removeShare(shareId);
  }
}
