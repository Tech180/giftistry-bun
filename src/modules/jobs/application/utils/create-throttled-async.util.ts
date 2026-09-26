import { JOB_STREAM_PUBLISH_MIN_INTERVAL_MS } from '../constants/job-stream-publish.constant';

/**
 * Throttle an async publisher so rapid stream updates coalesce to ~minIntervalMs.
 */
export function createThrottledAsync(
  publish: () => void | Promise<void>,
  minIntervalMs = JOB_STREAM_PUBLISH_MIN_INTERVAL_MS
): { schedule: () => void; flushPending: () => void; cancel: () => void } {
  let lastPublishAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    lastPublishAt = Date.now();
    void publish();
  };

  const schedule = () => {
    const elapsed = Date.now() - lastPublishAt;
    if (elapsed >= minIntervalMs) {
      run();
      return;
    }
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      run();
    }, minIntervalMs - elapsed);
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flushPending = () => {
    cancel();
  };

  return { schedule, flushPending, cancel };
}
