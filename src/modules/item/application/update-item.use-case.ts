import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { Item } from '../domain/item.entity';
import type { AssertItemVisibleUseCase } from './assert-item-visible.use-case';
import { AppError } from '@/common/middlewares/error.middleware';

export class UpdateItemUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private audienceRepo: ItemAudienceRepository,
    private assertItemVisible: AssertItemVisibleUseCase
  ) {}

  async execute(
    itemId: string,
    currentUserId: string,
    name: string,
    description: string | null = null,
    priorityId: string | null = null,
    category: string = 'uncategorized',
    priority: number | null = null,
    sharedWithUserIds?: string[] | null
  ): Promise<Item> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    await this.assertItemVisible.execute(itemId, currentUserId);

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    const updated = await this.itemRepo.update(itemId, name, description, priorityId, category, priority);

    let sharedWith = await this.audienceRepo.findByItemId(itemId);
    if (sharedWithUserIds !== undefined) {
      sharedWith = await this.audienceRepo.setAudience(itemId, sharedWithUserIds ?? []);
    }

    return {
      ...updated,
      SharedWith: sharedWith.length > 0 ? sharedWith : undefined,
    };
  }
}
