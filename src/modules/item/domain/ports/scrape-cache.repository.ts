import type { ScrapeCacheEntry } from '../interfaces/scrape-cache-entry.interface';

export interface ScrapeCacheRepository {
  get(cacheKey: string): Promise<ScrapeCacheEntry | null>;
  set(entry: ScrapeCacheEntry): Promise<void>;
  delete(cacheKey: string): Promise<void>;
}
