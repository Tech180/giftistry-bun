import type { CheerioAPI } from 'cheerio';
import { decodeHtmlEntities } from '../../utils/html.util';

export function getMetaContent($: CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const el = $(selector).first();
    const content = el.attr('content')?.trim();
    if (content) return decodeHtmlEntities(content);
  }
  return '';
}
