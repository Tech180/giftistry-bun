import { describe, expect, test, vi } from 'bun:test';
import type { BackgroundJobRepository } from '../src/modules/jobs/domain/ports/background-job.repository';
import {
  JOB_HEARTBEAT_INTERVAL_MS,
  withJobHeartbeat,
} from '../src/modules/jobs/application/with-job-heartbeat.util';

describe('withJobHeartbeat', () => {
  test('bumps progress while work is in flight and clears on settle', async () => {
    const updateProgress = vi.fn(async () => null);
    const jobRepo = { updateProgress } as unknown as BackgroundJobRepository;

    let resolveWork!: (value: string) => void;
    const work = new Promise<string>((resolve) => {
      resolveWork = resolve;
    });

    const resultPromise = withJobHeartbeat(jobRepo, 'job-1', work, 20);

    await Bun.sleep(55);
    expect(updateProgress.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(updateProgress).toHaveBeenCalledWith('job-1', {});

    resolveWork('done');
    await expect(resultPromise).resolves.toBe('done');

    const callsAfterDone = updateProgress.mock.calls.length;
    await Bun.sleep(50);
    expect(updateProgress.mock.calls.length).toBe(callsAfterDone);
  });

  test('exports a heartbeat interval under reclaim windows', () => {
    expect(JOB_HEARTBEAT_INTERVAL_MS).toBeLessThan(5 * 60 * 1000);
  });
});
