import type { TourChapterId } from './tour-chapter-id.type';
import type { TourChapterStatus } from './tour-chapter-status.type';

export interface TourState {
  FirstRunDismissed: boolean;
  Chapters: Partial<Record<TourChapterId, TourChapterStatus>>;
}
