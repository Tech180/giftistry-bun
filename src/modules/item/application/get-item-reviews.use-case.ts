import type { ItemReviewRepository } from '../domain/ports/item-review.repository';
import type { ItemReview } from '../domain/ports/item-review.repository';

export class GetItemReviewsUseCase {
  constructor(private itemReviewRepo: ItemReviewRepository) {}

  async execute(itemId: string): Promise<ItemReview | null> {
    return await this.itemReviewRepo.findByItemId(itemId);
  }
}
