import type { ScrapeTelemetryEvent } from '../interfaces/scrape-telemetry-event.interface';
import type { ScrapeConfidence } from '../types/scrape-confidence.type';
import type { ScrapeSource } from '../types/scrape-source.type';
import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';
import type { AiPopulateStatus } from '../types/ai-populate-status.type';
import {
  scrapeTelemetryHost,
  scrapeTelemetryUrlHash,
} from './scrape-telemetry-url.util';

export function resolveScrapePlatformFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('amazon') || host === 'a.co' || host.startsWith('amzn.')) {
      return 'amazon';
    }
    if (host.includes('walmart')) return 'walmart';
    if (host.includes('target.')) return 'target';
    if (host.includes('dickssportinggoods') || host.includes('dicks.com')) return 'dicks';
    if (host.includes('shopify')) return 'shopify';
  } catch {
    /* invalid URL */
  }
  return 'generic';
}

export function buildScrapeTelemetryEvent(input: {
  url: string;
  platform?: string;
  tier: ScrapeSource;
  outcome: FetchOutcomeKind | 'error';
  durationMs: number;
  scrapeDurationMs?: number;
  aiDurationMs?: number;
  fieldsFound?: string[];
  confidence?: ScrapeConfidence;
  blockedReason?: string;
  aiPopulate?: AiPopulateStatus;
  cacheHit?: boolean;
}): ScrapeTelemetryEvent {
  return {
    host: scrapeTelemetryHost(input.url),
    platform: input.platform ?? resolveScrapePlatformFromUrl(input.url),
    tier: input.tier,
    outcome: input.outcome,
    blockedReason: input.blockedReason,
    durationMs: input.durationMs,
    ...(input.scrapeDurationMs != null ? { scrapeDurationMs: input.scrapeDurationMs } : {}),
    ...(input.aiDurationMs != null ? { aiDurationMs: input.aiDurationMs } : {}),
    fieldsFound: input.fieldsFound ?? [],
    confidence: input.confidence,
    aiPopulate: input.aiPopulate,
    cacheHit: input.cacheHit ?? false,
    urlHash: scrapeTelemetryUrlHash(input.url),
  };
}
