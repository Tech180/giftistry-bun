import type { ScrapeCacheRepository } from '../../../../domain/ports/scrape-cache.repository';
import type { FetchOutcome } from '../../../../domain/types/fetch-outcome.type';
import type { FetchOutcomeKind } from '../../../../domain/types/fetch-outcome-kind.type';
import { buildScrapeCacheKey } from './scrape-cache-key.util';

function outcomeKindFromFetch(outcome: FetchOutcome): FetchOutcomeKind {
  if (outcome.kind === 'ok') return 'ok';
  if (outcome.kind === 'terminal') return outcome.outcome;
  return outcome.outcome;
}

export async function persistScrapeCache(
  repo: ScrapeCacheRepository,
  url: string,
  outcome: FetchOutcome
): Promise<void> {
  const outcomeKind = outcomeKindFromFetch(outcome);
  const cacheKey = buildScrapeCacheKey(url);
  await repo.set({
    cacheKey,
    outcomeKind,
    html: outcome.kind === 'ok' ? outcome.html : outcome.html,
    finalUrl:
      outcome.kind === 'ok'
        ? outcome.finalUrl
        : outcome.kind === 'terminal'
          ? outcome.finalUrl
          : outcome.finalUrl,
    status:
      outcome.kind === 'ok'
        ? outcome.status
        : outcome.kind === 'terminal'
          ? outcome.status
          : outcome.status,
    capturedJson:
      outcome.kind === 'ok'
        ? outcome.capturedJson
        : outcome.kind === 'escalate'
          ? outcome.capturedJson
          : undefined,
    strategy: outcome.strategy,
    cachedAt: Date.now(),
  });
}
