import type { ExtractedMetadata, ScrapeConfidence, ScrapeMode } from '../../domain/extracted-metadata';
import { isGenericTitle } from './extractors/meta-tag.extractor';
import { computeConfidence, computeFieldsFound } from './extractors/merge';

const CLOUDFLARE_MARKERS = [
  'cf-browser-verification',
  'challenge-platform',
  'just a moment',
  'checking your browser',
];

const AKAMAI_MARKERS = [
  'site maintenance',
  'oops, something went wrong',
  'akamaighost',
  'error: 0.',
  'please try accessing the site again',
];

const BOT_CHECK_MARKERS = ['robot check', 'captcha', 'access denied', '403 forbidden', 'request blocked'];

function stripNonVisibleHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  blocked?: boolean;
  confidence?: ScrapeConfidence;
  fieldsFound?: string[];
}

function htmlIndicatesBlock(html: string): { reason: string; blocked: boolean } | null {
  const lowerHtml = html.toLowerCase();

  for (const marker of CLOUDFLARE_MARKERS) {
    if (lowerHtml.includes(marker)) return { reason: `cloudflare:${marker}`, blocked: true };
  }

  for (const marker of AKAMAI_MARKERS) {
    if (lowerHtml.includes(marker)) return { reason: `akamai:${marker}`, blocked: true };
  }

  for (const marker of BOT_CHECK_MARKERS) {
    if (lowerHtml.includes(marker)) return { reason: `bot-check:${marker}`, blocked: true };
  }

  return null;
}

function titleIndicatesBlock(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  for (const marker of BOT_CHECK_MARKERS) {
    if (lowerTitle.includes(marker)) return `bot-check:${marker}`;
  }
  if (isGenericTitle(title)) return 'generic-retailer-shell';
  return null;
}

export interface ValidateOptions {
  titleFromSlug?: boolean;
}

export function validateScrapeResult(
  result: ExtractedMetadata,
  html: string,
  mode: ScrapeMode,
  options: ValidateOptions = {}
): ValidationResult {
  const fieldsFound = computeFieldsFound(result);
  const confidence = computeConfidence(result, options.titleFromSlug ?? false);
  const visibleHtml = stripNonVisibleHtml(html);

  if (!html || html.length < 500) {
    return { valid: false, reason: 'empty-or-short-html', confidence, fieldsFound };
  }

  const htmlBlock = htmlIndicatesBlock(visibleHtml);
  if (htmlBlock) {
    return {
      valid: false,
      reason: htmlBlock.reason,
      blocked: htmlBlock.blocked,
      confidence,
      fieldsFound,
    };
  }

  const titleBlock = titleIndicatesBlock(result.title);
  if (titleBlock) {
    return { valid: false, reason: titleBlock, confidence, fieldsFound };
  }

  const hasTitle = Boolean(result.title?.trim());
  const hasDescription = Boolean(result.description?.trim());
  const hasPrice = result.price !== null;
  const hasImage = Boolean(result.imageUrl?.trim());

  if (mode === 'full') {
    if (!hasTitle) {
      return { valid: false, reason: 'missing-title-full', confidence, fieldsFound };
    }

    if (options.titleFromSlug && !hasPrice && !hasDescription) {
      return { valid: false, reason: 'slug-title-only', confidence: 'low', fieldsFound };
    }

    if (!hasPrice && !hasDescription) {
      return { valid: false, reason: 'missing-price-or-description-full', confidence, fieldsFound };
    }
  } else {
    if (!hasImage && !hasPrice) {
      return { valid: false, reason: 'missing-critical-fields-minimal', confidence, fieldsFound };
    }
  }

  return { valid: true, confidence, fieldsFound };
}
