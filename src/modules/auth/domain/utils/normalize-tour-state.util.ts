import { EMPTY_TOUR_STATE } from '../constants/empty-tour-state.constant';
import type { TourState } from '../interfaces/tour-state.interface';
import { isTourChapterId } from './is-tour-chapter-id.util';

export function normalizeTourState(raw: unknown): TourState {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_TOUR_STATE, Chapters: {} };
  }

  const record = raw as Record<string, unknown>;
  const chaptersRaw = record.chapters ?? record.Chapters;
  const chapters: TourState['Chapters'] = {};

  if (chaptersRaw && typeof chaptersRaw === 'object') {
    for (const [key, value] of Object.entries(chaptersRaw as Record<string, unknown>)) {
      if (!isTourChapterId(key)) {
        continue;
      }

      if (value === 'completed' || value === 'skipped' || value === 'pending') {
        chapters[key] = value;
      }
    }
  }

  const firstRunDismissed =
    record.firstRunDismissed === true ||
    record.FirstRunDismissed === true;

  return {
    FirstRunDismissed: firstRunDismissed,
    Chapters: chapters,
  };
}
