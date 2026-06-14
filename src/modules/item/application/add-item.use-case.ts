import type { ItemRepository } from '../domain/ports/item.repository';
import type { Item } from '../domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class AddItemUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(
    listId: string,
    name: string,
    description: string | null = null,
    priorityId: string | null = null,
    isHiddenIdea: boolean = false,
    suggestedByUserId: string | null = null
  ): Promise<Item> {
    if (!listId) {
      throw new AppError('List ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    return await this.itemRepo.create(listId, priorityId, suggestedByUserId, name, description, isHiddenIdea);
  }
}
