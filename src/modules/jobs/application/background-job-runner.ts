import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import type { RunWishlistImportJobUseCase } from '../slices/import/use-cases/run-wishlist-import-job.use-case';
import type { RunItemEnrichJobUseCase } from '../slices/enrich/use-cases/run-item-enrich-job.use-case';
import type { RunItemSummarizeJobUseCase } from '../slices/summarize/use-cases/run-item-summarize-job.use-case';
import {
  BOOT_RECLAIM_MS,
  PERIODIC_RECLAIM_INTERVAL_MS,
  PERIODIC_RECLAIM_MS,
} from './constants/job-reclaim.constant';

export class BackgroundJobRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private reclaimTimer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private jobRepo: BackgroundJobRepository,
    private runWishlistImport: RunWishlistImportJobUseCase,
    private runItemEnrich: RunItemEnrichJobUseCase,
    private runItemSummarize: RunItemSummarizeJobUseCase
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
      } else if (job.Kind === 'item-enrich') {
        await this.runItemEnrich.execute(job);
      } else if (job.Kind === 'item-summarize') {
        await this.runItemSummarize.execute(job);
      }
    } catch (err) {
      console.error('[BackgroundJobRunner] tick failed:', err);
    } finally {
      this.busy = false;
    }
  }
}
