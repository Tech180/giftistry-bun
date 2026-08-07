import { describe, expect, test } from 'bun:test';
import {
  clearGrabPhasePayloadPatch,
  formatGrabPhaseDetail,
  grabPhasePayloadPatch,
  readGrabPhase,
  streamProgressRateFromPayload,
} from '../src/modules/jobs/domain/grab-item-phase.util';
import { toActiveStreams } from '../src/modules/jobs/domain/background-job.entity';
import type { BackgroundJobItem } from '../src/modules/jobs/domain/background-job.entity';

describe('grab-item-phase.util', () => {
  test('formats phase details', () => {
    expect(formatGrabPhaseDetail('scraping')).toBe('Scraping…');
    expect(formatGrabPhaseDetail('categorizing')).toBe('Categorizing…');
    expect(formatGrabPhaseDetail('researching')).toBe('Researching…');
    expect(formatGrabPhaseDetail('populating')).toBe('Populating…');
  });

  test('grabPhasePayloadPatch clears rate on scrape/research', () => {
    expect(grabPhasePayloadPatch('scraping', 40)).toEqual({
      GrabPhase: 'scraping',
      TokensPerSecond: null,
    });
    expect(grabPhasePayloadPatch('categorizing', 40)).toEqual({
      GrabPhase: 'categorizing',
      TokensPerSecond: 40,
    });
  });

  test('streamProgressRateFromPayload only for AI phases', () => {
    expect(
      streamProgressRateFromPayload({ GrabPhase: 'scraping', TokensPerSecond: 20 })
    ).toBeNull();
    expect(
      streamProgressRateFromPayload({ GrabPhase: 'populating', TokensPerSecond: 22 })
    ).toEqual({ Value: 22, Unit: 'tok/s' });
  });

  test('clear patch nulls phase fields', () => {
    expect(clearGrabPhasePayloadPatch()).toEqual({
      GrabPhase: null,
      TokensPerSecond: null,
    });
    expect(readGrabPhase(clearGrabPhasePayloadPatch())).toBeNull();
  });
});

describe('toActiveStreams phase detail', () => {
  test('includes Detail and ProgressRate from payload', () => {
    const now = new Date().toISOString();
    const items = [
      {
        Id: 'item-1',
        JobId: 'job-1',
        ItemId: 'w1',
        Status: 'running' as const,
        LinkUrl: 'https://example.com/a',
        Payload: {
          name: 'Helix',
          GrabPhase: 'categorizing',
          TokensPerSecond: 32,
        },
        Error: null,
        CreatedAt: now,
        UpdatedAt: now,
      },
    ] satisfies BackgroundJobItem[];

    const streams = toActiveStreams(items, 16);
    expect(streams).toHaveLength(1);
    expect(streams[0]?.Label).toBe('Helix');
    expect(streams[0]?.Phase).toBe('categorizing');
    expect(streams[0]?.Detail).toBe('Categorizing…');
    expect(streams[0]?.ProgressRate).toEqual({ Value: 32, Unit: 'tok/s' });
  });
});
