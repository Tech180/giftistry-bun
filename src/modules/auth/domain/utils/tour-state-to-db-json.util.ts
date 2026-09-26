import type { TourState } from '../interfaces/tour-state.interface';

export function tourStateToDbRecord(tour: TourState): {
  firstRunDismissed: boolean;
  chapters: TourState['Chapters'];
} {
  return {
    firstRunDismissed: tour.FirstRunDismissed === true,
    chapters: tour.Chapters,
  };
}

export function tourStateToDbJson(tour: TourState): string {
  return JSON.stringify(tourStateToDbRecord(tour));
}
