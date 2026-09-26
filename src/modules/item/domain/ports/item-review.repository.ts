import type { ReviewData } from '../interfaces/review-data.interface';
import type { ItemReview } from '../interfaces/item-review.interface';
import type { ItemBackfillCandidate } from '../interfaces/item-backfill-candidate.interface';

export interface ItemReviewRepository {
  findByItemId(itemId: string): Promise<ItemReview | null>;
  exists(itemId: string): Promise<boolean>;
  save(itemId: string, data: ReviewData): Promise<void>;
  findItemsNeedingBackfill(listId: string): Promise<ItemBackfillCandidate[]>;
}
