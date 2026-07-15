import { AppError } from '@/common/middlewares/error.middleware';
import type { AddItemUseCase } from './add-item.use-case';
import type { ValidateItemAudienceUseCase } from './validate-item-audience.use-case';
import type { Item } from '../domain/item.entity';

export interface BulkAddItemInput {
  name: string;
  description?: string | null;
  priorityId?: string | null;
  isHiddenIdea?: boolean;
  linkUrl?: string | null;
  price?: number | null;
  websiteName?: string | null;
  category?: string | null;
  priority?: number | null;
  sharedWithUserIds?: string[];
}

export interface BulkAddItemsResult {
  created: number;
  items: Item[];
  failed: Array<{ index: number; message: string }>;
}

export const MAX_BULK_ADD_BATCH = 500;

export class BulkAddItemsUseCase {
  constructor(
    private addItem: AddItemUseCase,
    private validateItemAudience: ValidateItemAudienceUseCase
  ) {}

  async execute(
    listId: string,
    userId: string,
    role: string,
    items: BulkAddItemInput[]
  ): Promise<BulkAddItemsResult> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('At least one item is required', 400, 'BAD_REQUEST');
    }
    if (items.length > MAX_BULK_ADD_BATCH) {
      throw new AppError(
        `Cannot import more than ${MAX_BULK_ADD_BATCH} items at once`,
        400,
        'BAD_REQUEST'
      );
    }

    const isSuggestion = role !== 'owner';
    const isOwner = role === 'owner';
    const createdItems: Item[] = [];
    const failed: Array<{ index: number; message: string }> = [];

    for (let index = 0; index < items.length; index++) {
      const row = items[index];
      try {
        const resolvedHidden = row.isHiddenIdea ?? false;
        if (role === 'owner' && resolvedHidden) {
          throw new AppError('Owner cannot add hidden ideas to their own list', 403, 'FORBIDDEN');
        }

        const validatedAudience = await this.validateItemAudience.execute(
          listId,
          row.sharedWithUserIds,
          userId,
          isOwner
        );

        const item = await this.addItem.execute(
          listId,
          row.name,
          row.description ?? null,
          row.priorityId ?? null,
          resolvedHidden || isSuggestion,
          userId,
          row.linkUrl ?? null,
          row.price !== undefined && row.price !== null ? Number(row.price) : null,
          row.websiteName ?? null,
          row.category ?? 'uncategorized',
          isSuggestion,
          row.priority !== undefined && row.priority !== null ? Number(row.priority) : null,
          validatedAudience
        );
        createdItems.push(item);
      } catch (err) {
        failed.push({
          index,
          message: err instanceof Error ? err.message : 'Failed to create item',
        });
      }
    }

    return {
      created: createdItems.length,
      items: createdItems,
      failed,
    };
  }
}
