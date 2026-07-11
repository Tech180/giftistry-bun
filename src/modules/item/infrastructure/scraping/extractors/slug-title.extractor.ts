import type { MetadataExtractor } from './types';

export function extractTitleFromSlug(url: string): string {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);
    const slug = segments.find((s) => s.includes('-') || s.includes('_')) || segments[0];
    if (!slug || slug.length <= 2) return '';

    const cleanSlug = slug
      .replace(/[-_]+/g, ' ')
      .replace(/\.[a-z0-9]+$/i, '')
      .trim();

    return cleanSlug
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return '';
  }
}

export const slugTitleExtractor: MetadataExtractor = {
  name: 'slug-title',
  priority: 10,
  extract({ url }) {
    const title = extractTitleFromSlug(url);
    if (!title) return {};
    return { title, titleFromSlug: true };
  },
};
