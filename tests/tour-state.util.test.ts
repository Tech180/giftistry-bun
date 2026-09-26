import { describe, expect, test } from 'bun:test';
import { EMPTY_TOUR_STATE } from '../src/modules/auth/domain/constants/empty-tour-state.constant';
import { normalizeTourState } from '../src/modules/auth/domain/utils/normalize-tour-state.util';
import { tourStateToDbJson } from '../src/modules/auth/domain/utils/tour-state-to-db-json.util';

describe('normalizeTourState', () => {
  test('returns empty for invalid input', () => {
    expect(normalizeTourState(null)).toEqual({ ...EMPTY_TOUR_STATE, Chapters: {} });
    expect(normalizeTourState('nope')).toEqual({ ...EMPTY_TOUR_STATE, Chapters: {} });
  });

  test('accepts snake and Pascal keys', () => {
    expect(
      normalizeTourState({
        firstRunDismissed: true,
        chapters: { demo: 'completed', beginner: 'skipped', junk: 'completed' },
      })
    ).toEqual({
      FirstRunDismissed: true,
      Chapters: { demo: 'completed', beginner: 'skipped' },
    });

    expect(
      normalizeTourState({
        FirstRunDismissed: true,
        Chapters: { theming: 'pending' },
      })
    ).toEqual({
      FirstRunDismissed: true,
      Chapters: { theming: 'pending' },
    });
  });
});

describe('tourStateToDbJson', () => {
  test('round-trips via normalize', () => {
    const json = tourStateToDbJson({
      FirstRunDismissed: true,
      Chapters: { beginner: 'completed' },
    });
    expect(normalizeTourState(JSON.parse(json))).toEqual({
      FirstRunDismissed: true,
      Chapters: { beginner: 'completed' },
    });
  });
});
