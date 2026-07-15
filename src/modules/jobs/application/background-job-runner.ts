import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { RunWishlistImportJobUseCase } from './run-wishlist-import-job.use-case';

const BOOT_RECLAIM_MS = 0;
/** Above max configurable AI completion timeout (30m) so live grabs are not re-queued mid-flight. */
export const PERIODIC_RECLAIM_MS = 35 * 60 * 1000;
const PERIODIC_RECLAIM_INTERVAL_MS = 2 * 60 * 1000;

export class BackgroundJobRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private reclaimTimer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private jobRepo: BackgroundJobRepository,
    private runWishlistImport: RunWishlistImportJobUseCase
  ) {}

  start(intervalMs = 1500): void {
    if (this.timer) return;
    void this.jobRepo.reclaimStaleRunning(BOOT_RECLAIM_MS).then((n) => {
      if (n > 0) {
        console.log(`[BackgroundJobRunner] reclaimed ${n} stale running job(s) on boot`);
      }
    });
    this.reclaimTimer = setInterval(() => {
      void this.jobRepo.reclaimStaleRunning(PERIODIC_RECLAIM_MS).then((n) => {
        if (n > 0) {
          console.log(`[BackgroundJobRunner] reclaimed ${n} stale running job(s)`);
        }
      });
    }, PERIODIC_RECLAIM_INTERVAL_MS);
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    void this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.reclaimTimer) {
      clearInterval(this.reclaimTimer);
      this.reclaimTimer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const job = await this.jobRepo.claimNextQueued();
      if (!job) return;
      if (job.Kind === 'wishlist-import') {
        await this.runWishlistImport.execute(job);
      }
    } catch (err) {
      console.error('[BackgroundJobRunner] tick failed:', err);
    } finally {
      this.busy = false;
    }
  }
}
