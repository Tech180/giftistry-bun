export const TOUR_CHAPTER_IDS = [
  'demo',
  'beginner',
  'importAi',
  'listTools',
  'shareDeep',
  'friendsDeep',
  'notifications',
  'theming',
] as const;

export type TourChapterId = (typeof TOUR_CHAPTER_IDS)[number];

export type TourChapterStatus = 'pending' | 'completed' | 'skipped';

export interface TourState {
  FirstRunDismissed: boolean;
  Chapters: Partial<Record<TourChapterId, TourChapterStatus>>;
}

export const EMPTY_TOUR_STATE: TourState = {
  FirstRunDismissed: false,
  Chapters: {},
};

export const ONBOARDED_TOUR_BACKFILL: TourState = {
  FirstRunDismissed: true,
  Chapters: { beginner: 'completed' },
};

export function isTourChapterId(value: unknown): value is TourChapterId {
  return typeof value === 'string' && (TOUR_CHAPTER_IDS as readonly string[]).includes(value);
}

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

export function tourStateToDbJson(tour: TourState): string {
  return JSON.stringify({
    firstRunDismissed: tour.FirstRunDismissed === true,
    chapters: tour.Chapters,
  });
}
