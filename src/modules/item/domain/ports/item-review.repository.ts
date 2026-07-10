import type { ReviewData } from './review-extractor.port';

export interface ItemReview {
  ItemId: string;
  Summary: string;
  Pros: string[];
  Cons: string[];
  Reviews: ReviewData['reviews'];
}

export interface ItemBackfillCandidate {
  itemId: string;
  url: string;
}

export interface ItemReviewRepository {
  findByItemId(itemId: string): Promise<ItemReview | null>;
  exists(itemId: string): Promise<boolean>;
  save(itemId: string, data: ReviewData): Promise<void>;
  findItemsNeedingBackfill(listId: string): Promise<ItemBackfillCandidate[]>;
}
