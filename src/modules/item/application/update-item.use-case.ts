import type { ItemRepository } from '../domain/ports/item.repository';
import type { Item } from '../domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class UpdateItemUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(
    itemId: string,
    name: string,
    description: string | null = null,
    priorityId: string | null = null,
    category: string = 'uncategorized',
    priority: number | null = null
  ): Promise<Item> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    return await this.itemRepo.update(itemId, name, description, priorityId, category, priority);
  }
}
