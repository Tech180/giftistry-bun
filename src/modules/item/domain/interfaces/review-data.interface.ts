import type { ReviewEntry } from './review-entry.interface';

export interface ReviewData {
  summary: string;
  pros: string[];
  cons: string[];
  reviews: ReviewEntry[];
}
