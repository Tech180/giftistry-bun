import { TOUR_CHAPTER_IDS } from '../constants/tour-chapter-ids.constant';
import type { TourChapterId } from '../interfaces/tour-chapter-id.type';

export function isTourChapterId(value: unknown): value is TourChapterId {
  return typeof value === 'string' && (TOUR_CHAPTER_IDS as readonly string[]).includes(value);
}
