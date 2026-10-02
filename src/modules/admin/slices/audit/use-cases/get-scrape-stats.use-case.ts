import type { ScrapeStatsResult } from '../../../domain/interfaces/scrape-stats-result.interface';

/** Placeholder until scrape telemetry is persisted for admin reporting. */
export class GetScrapeStatsUseCase {
  execute(): ScrapeStatsResult {
    return { Available: false };
  }
}
