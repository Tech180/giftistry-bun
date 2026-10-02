import type { AiPopulateStatus } from '../types/ai-populate-status.type';
import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';
import type { ScrapeConfidence } from '../types/scrape-confidence.type';
import type { ScrapeSource } from '../types/scrape-source.type';

export interface ScrapeTelemetryEvent {
  host: string;
  platform: string;
  tier: ScrapeSource;
  outcome: FetchOutcomeKind | 'error';
  blockedReason?: string;
  /** Total wall time for the extract call (scrape plus AI stages). */
  durationMs: number;
  /** Wall time spent acquiring and extracting the page. */
  scrapeDurationMs?: number;
  /** Wall time spent after the scrape (category, research, populate). */
  aiDurationMs?: number;
  fieldsFound: string[];
  confidence?: ScrapeConfidence;
  aiPopulate?: AiPopulateStatus;
  cacheHit?: boolean;
  /** SHA-256 prefix of host + pathname — never log full URLs or query strings. */
  urlHash: string;
}
