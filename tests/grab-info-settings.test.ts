import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT,
  DEFAULT_GRAB_INFO_CONCURRENCY,
  GRAB_INFO_ACTIVE_STREAM_LIMIT_MAX,
  GRAB_INFO_CONCURRENCY_MAX,
  GRAB_INFO_CONCURRENCY_MIN,
} from '../src/modules/system/domain/constants/grab-info.constant';
import {
  clampGrabInfoActiveStreamLimit,
  clampGrabInfoConcurrency,
} from '../src/modules/system/domain/utils/clamp-server-config-limits.util';
import { normalizeGrabInfoConcurrencyUnlimited } from '../src/modules/system/domain/utils/normalize-grab-info-concurrency-unlimited.util';
import { resolveGrabInfoConcurrency } from '../src/modules/system/domain/utils/resolve-grab-info-concurrency.util';
import { toSystemSettingsView } from '../src/modules/system/domain/utils/to-system-settings-view.util';
import { toActiveStreams } from '../src/modules/jobs/domain/utils/to-active-streams.util';
import type { BackgroundJobItem } from '../src/modules/jobs/domain/interfaces/background-job-item.interface';

describe('grab info concurrency clamps', () => {
  test('clamps concurrency to 1–1000', () => {
    expect(clampGrabInfoConcurrency(0)).toBe(GRAB_INFO_CONCURRENCY_MIN);
    expect(clampGrabInfoConcurrency(5000)).toBe(GRAB_INFO_CONCURRENCY_MAX);
    expect(clampGrabInfoConcurrency(12)).toBe(12);
    expect(clampGrabInfoConcurrency('nope')).toBe(DEFAULT_GRAB_INFO_CONCURRENCY);
  });

  test('unlimited defaults off', () => {
    expect(normalizeGrabInfoConcurrencyUnlimited(undefined)).toBe(false);
    expect(normalizeGrabInfoConcurrencyUnlimited(false)).toBe(false);
    expect(normalizeGrabInfoConcurrencyUnlimited(true)).toBe(true);
    expect(normalizeGrabInfoConcurrencyUnlimited(1)).toBe(false);
  });

  test('resolveGrabInfoConcurrency uses work count when unlimited', () => {
    expect(
      resolveGrabInfoConcurrency(
        { GrabInfoConcurrency: 3, GrabInfoConcurrencyUnlimited: true },
        40
      )
    ).toBe(40);
    expect(
      resolveGrabInfoConcurrency(
        { GrabInfoConcurrency: 7, GrabInfoConcurrencyUnlimited: false },
        40
      )
    ).toBe(7);
    expect(
      resolveGrabInfoConcurrency({ GrabInfoConcurrencyUnlimited: true }, 0)
    ).toBe(1);
  });

  test('clamps active stream limit', () => {
    expect(clampGrabInfoActiveStreamLimit(0)).toBe(1);
    expect(clampGrabInfoActiveStreamLimit(2000)).toBe(GRAB_INFO_ACTIVE_STREAM_LIMIT_MAX);
    expect(clampGrabInfoActiveStreamLimit(undefined)).toBe(DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT);
  });
});

describe('toSystemSettingsView grab info', () => {
  test('defaults unlimited off and concurrency 3', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });
    expect(view.GrabInfoConcurrency).toBe(DEFAULT_GRAB_INFO_CONCURRENCY);
    expect(view.GrabInfoConcurrencyUnlimited).toBe(false);
    expect(view.GrabInfoActiveStreamLimit).toBe(DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT);
  });

  test('returns saved values', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      GrabInfoConcurrency: 25,
      GrabInfoConcurrencyUnlimited: true,
      GrabInfoActiveStreamLimit: 8,
    });
    expect(view.GrabInfoConcurrency).toBe(25);
    expect(view.GrabInfoConcurrencyUnlimited).toBe(true);
    expect(view.GrabInfoActiveStreamLimit).toBe(8);
  });
});

describe('toActiveStreams limit', () => {
  test('slices to configured limit', () => {
    const now = new Date().toISOString();
    const items = Array.from({ length: 10 }, (_, index) => ({
      Id: `item-${index}`,
      JobId: 'job-1',
      ItemId: `wishlist-${index}`,
      Status: index < 2 ? ('running' as const) : ('pending' as const),
      LinkUrl: `https://example.com/${index}`,
      Payload: { name: `Item ${index}` },
      Error: null,
      CreatedAt: now,
      UpdatedAt: now,
    })) satisfies BackgroundJobItem[];

    expect(toActiveStreams(items, 3)).toHaveLength(3);
    expect(toActiveStreams(items, 3).map((stream) => stream.Label)).toEqual([
      'Item 0',
      'Item 1',
      'Item 2',
    ]);
  });
});
