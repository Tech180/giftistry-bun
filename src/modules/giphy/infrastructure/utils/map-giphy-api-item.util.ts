import type { GifSearchResult } from '../../domain/interfaces/gif-search-result.interface';

type GiphyApiImage = { url?: string };
type GiphyApiItem = {
  id?: string;
  title?: string;
  images?: {
    fixed_height_small?: GiphyApiImage;
    original?: GiphyApiImage;
  };
};

export function mapGiphyApiItem(item: GiphyApiItem): GifSearchResult | null {
  const id = item.id?.trim();
  const url = item.images?.fixed_height_small?.url?.trim();
  const originalUrl = item.images?.original?.url?.trim() || url;
  if (!id || !url || !originalUrl) {
    return null;
  }
  return {
    id,
    url,
    originalUrl,
    title: item.title?.trim() || '',
  };
}
