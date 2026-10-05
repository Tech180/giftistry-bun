import type { CheerioAPI } from 'cheerio';
import { decodeHtmlEntities } from '../../utils/html.util';
import { getMetaContent } from './get-meta-content.util';
import { isGenericTitle } from './is-generic-title.util';
import { resolveAmazonProductTitleFromDom } from './resolve-amazon-product-title-from-dom.util';
import { stripAmazonRetailSeoTitle } from '../../../../domain/utils/strip-amazon-retail-seo-title.util';

function acceptTitle(candidate: string | null | undefined): string | null {
  const trimmed = candidate?.replace(/\s+/g, ' ').trim();
  if (!trimmed || isGenericTitle(trimmed)) {
    return null;
  }
  return trimmed;
}

export function resolveAmazonScrapeTitle($: CheerioAPI): string | null {
  const fromDom = acceptTitle(resolveAmazonProductTitleFromDom($));
  if (fromDom) {
    return fromDom;
  }

  const metaRaw =
    getMetaContent($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    $('title').first().text().trim();

  if (!metaRaw) {
    return null;
  }

  const decoded = decodeHtmlEntities(metaRaw);
  const stripped = stripAmazonRetailSeoTitle(decoded);
  return acceptTitle(stripped);
}
