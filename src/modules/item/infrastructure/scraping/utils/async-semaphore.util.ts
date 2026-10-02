import { ScrapeError } from '../../../domain/errors/scrape-error';
import type { AsyncSemaphoreWaiter } from '../interfaces/async-semaphore-waiter.interface';

/**
 * FIFO async semaphore with a wait timeout.
 * On timeout, throws ScrapeError with outcome 'busy'.
 */
export class AsyncSemaphore {
  private active = 0;
  private readonly waiters: AsyncSemaphoreWaiter[] = [];

  constructor(
    private readonly limit: number,
    private readonly queueTimeoutMs: number
  ) {
    if (limit < 1) {
      throw new Error('AsyncSemaphore limit must be >= 1');
    }
  }

  get activeCount(): number {
    return this.active;
  }

  get waitingCount(): number {
    return this.waiters.length;
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((w) => w.resolve === resolve);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        reject(
          new ScrapeError('Playwright queue timeout: too many concurrent scrapes', {
            outcome: 'busy',
            blocked: false,
            validationReason: 'busy',
          })
        );
      }, this.queueTimeoutMs);

      this.waiters.push({ resolve, reject, timer });
    });

    this.active += 1;
    return () => this.release();
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (!next) {
      return;
    }
    clearTimeout(next.timer);
    next.resolve();
  }
}
