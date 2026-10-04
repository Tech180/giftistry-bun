import type { GifSearchResult } from '../interfaces/gif-search-result.interface';

export interface GiphyCatalog {
  search(apiKey: string, query: string, limit: number): Promise<GifSearchResult[]>;
}
