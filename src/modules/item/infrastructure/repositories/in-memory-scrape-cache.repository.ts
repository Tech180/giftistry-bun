import type { ScrapeCacheRepository } from '../../domain/ports/scrape-cache.repository';
import type { ScrapeCacheEntry } from '../../domain/interfaces/scrape-cache-entry.interface';
import type { FetchOutcomeKind } from '../../domain/types/fetch-outcome-kind.type';
import {
  DEFAULT_SCRAPE_CACHE_TTL_MS,
  SCRAPE_CACHE_TTL_MS,
} from '../scraping/constants/scrape-cache-ttl.constant';

function ttlFor(outcomeKind: FetchOutcomeKind): number {
  return SCRAPE_CACHE_TTL_MS[outcomeKind] ?? DEFAULT_SCRAPE_CACHE_TTL_MS;
}

export class InMemoryScrapeCacheRepository implements ScrapeCacheRepository {
  private readonly store = new Map<string, ScrapeCacheEntry>();

  async get(cacheKey: string): Promise<ScrapeCacheEntry | null> {
    const entry = this.store.get(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > ttlFor(entry.outcomeKind)) {
      this.store.delete(cacheKey);
      return null;
    }
    return entry;
  }

  async set(entry: ScrapeCacheEntry): Promise<void> {
    this.store.set(entry.cacheKey, entry);
  }

  async delete(cacheKey: string): Promise<void> {
    this.store.delete(cacheKey);
  }
}
