import type { ItemRepository } from '../domain/ports/item.repository';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import { AppError } from '@/common/middlewares/error.middleware';

export class DeleteItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private assertItemVisible: AssertItemVisibleUseCase
  ) {}

  async execute(itemId: string, currentUserId: string): Promise<void> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }

    await this.assertItemVisible.execute(itemId, currentUserId);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    await this.itemRepo.delete(itemId);
  }
}
