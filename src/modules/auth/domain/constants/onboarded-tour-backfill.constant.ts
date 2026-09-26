import type { TourState } from '../interfaces/tour-state.interface';

export const ONBOARDED_TOUR_BACKFILL: TourState = {
  FirstRunDismissed: true,
  Chapters: { beginner: 'completed' },
};
