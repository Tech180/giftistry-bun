import { AppError } from '@/common/domain/errors/app-error';
import type { GiphyCatalog } from '../../domain/ports/giphy-catalog.port';
import type { GifSearchResult } from '../../domain/interfaces/gif-search-result.interface';
import { GIPHY_API_BASE, GIPHY_FETCH_TIMEOUT_MS } from '../constants/giphy-api.constant';
import { mapGiphyApiItem } from '../utils/map-giphy-api-item.util';

export class GiphyHttpCatalog implements GiphyCatalog {
  async search(apiKey: string, query: string, limit: number): Promise<GifSearchResult[]> {
    const cleanQuery = query.trim();
    const path = cleanQuery
      ? `${GIPHY_API_BASE}/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(cleanQuery)}&limit=${limit}`
      : `${GIPHY_API_BASE}/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GIPHY_FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(path, { signal: controller.signal });
      if (!res.ok) {
        console.warn(`[GiphyCatalog] upstream status=${res.status}`);
        throw new AppError(
          'GIF search is temporarily unavailable. Please try again.',
          502,
          'GIPHY_UPSTREAM_ERROR'
        );
      }

      const json = (await res.json()) as { data?: unknown[] };
      const rows = Array.isArray(json.data) ? json.data : [];
      return rows
        .map((row) => mapGiphyApiItem(row as Parameters<typeof mapGiphyApiItem>[0]))
        .filter((item): item is GifSearchResult => item !== null);
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[GiphyCatalog] fetch failed: ${message}`);
      throw new AppError(
        'GIF search is temporarily unavailable. Please try again.',
        502,
        'GIPHY_UPSTREAM_ERROR'
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
