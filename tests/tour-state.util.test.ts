import { describe, expect, test } from 'bun:test';
import {
  EMPTY_TOUR_STATE,
  normalizeTourState,
  tourStateToDbJson,
} from '../src/modules/auth/domain/tour.state';

describe('tour.state', () => {
  test('normalizeTourState returns empty for invalid input', () => {
    expect(normalizeTourState(null)).toEqual({ ...EMPTY_TOUR_STATE, Chapters: {} });
    expect(normalizeTourState('nope')).toEqual({ ...EMPTY_TOUR_STATE, Chapters: {} });
  });

  test('normalizeTourState accepts snake and Pascal keys', () => {
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

  test('tourStateToDbJson round-trips via normalize', () => {
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
