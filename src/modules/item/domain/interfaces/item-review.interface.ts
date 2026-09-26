import type { ReviewData } from './review-data.interface';

export interface ItemReview {
  ItemId: string;
  Summary: string;
  Pros: string[];
  Cons: string[];
  Reviews: ReviewData['reviews'];
}
