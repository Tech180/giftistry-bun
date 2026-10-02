import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeMode } from '../../../domain/types/scrape-mode.type';
import { isAmazonScrapeUrl } from '../../../domain/utils/amazon-url.util';
import {
  AKAMAI_MARKERS,
  AKAMAI_TITLE_MARKERS,
  AMAZON_GATE_MARKERS,
  BOT_CHECK_MARKERS,
  CLOUDFLARE_MARKERS,
  VENDOR_CAPTCHA_MARKERS,
} from '../constants/block-page-markers.constant';
import { isGenericTitle } from '../extractors/utils/is-generic-title.util';
import {
  computeConfidence,
  computeFieldsFound,
} from './compute-scrape-confidence.util';
import type { ValidateOptions } from '../interfaces/validate-options.interface';
import type { ValidationResult } from '../interfaces/validation-result.interface';
import { runQualityGate } from './quality-gate.util';
import { htmlLooksLikeContinueShoppingShell } from './html-looks-like-continue-shopping-shell.util';
import { isAmazonShortLinkHost } from '../../../domain/utils/amazon-url.util';
import { SHORT_PAGE_VISIBLE_CHARS } from '../constants/short-page-visible-chars.constant';

function stripNonVisibleHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function extractTitleAndH1(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '';
  return `${title} ${h1}`.replace(/<[^>]+>/g, ' ').toLowerCase();
}

function hasStrongProductSignal(result: ExtractedMetadata): boolean {
  const hasTitle = Boolean(result.title?.trim());
  const hasPrice = result.price != null;
  const hasImage = Boolean(result.imageUrl?.trim());
  return hasTitle && hasPrice && hasImage;
}

function preferAmazonGate(html: string, url?: string): boolean {
  if (!url || !isAmazonScrapeUrl(url)) {
    return false;
  }
  if (htmlLooksLikeContinueShoppingShell(html)) {
    return true;
  }
  try {
    return isAmazonShortLinkHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function matchMarker(haystack: string, markers: readonly string[], prefix: string): string | null {
  for (const marker of markers) {
    if (haystack.includes(marker)) {
      return `${prefix}:${marker}`;
    }
  }
  return null;
}

function htmlIndicatesBlock(
  html: string,
  visibleHtml: string,
  result: ExtractedMetadata,
  options: { url?: string } = {}
): { reason: string; blocked: boolean } | null {
  const lowerVisible = visibleHtml.toLowerCase();
  const titleH1 = extractTitleAndH1(html);
  const isShortPage = lowerVisible.replace(/\s+/g, ' ').trim().length < SHORT_PAGE_VISIBLE_CHARS;
  const softHaystack = isShortPage ? `${titleH1} ${lowerVisible}` : titleH1;

  // Strong structured product signal wins over soft markers.
  if (hasStrongProductSignal(result)) {
    const vendor =
      matchMarker(lowerVisible, CLOUDFLARE_MARKERS, 'cloudflare') ||
      matchMarker(lowerVisible, AKAMAI_MARKERS, 'akamai') ||
      matchMarker(lowerVisible, VENDOR_CAPTCHA_MARKERS, 'vendor-captcha');
    // Only hard vendor frames can still block a strong product page.
    if (vendor && isShortPage) {
      return { reason: vendor, blocked: true };
    }
    return null;
  }

  const cloudflare = matchMarker(lowerVisible, CLOUDFLARE_MARKERS, 'cloudflare');
  if (cloudflare) {
    return { reason: cloudflare, blocked: true };
  }

  const akamai = matchMarker(lowerVisible, AKAMAI_MARKERS, 'akamai');
  if (akamai) {
    return { reason: akamai, blocked: true };
  }

  const akamaiTitle = matchMarker(titleH1, AKAMAI_TITLE_MARKERS, 'akamai');
  if (akamaiTitle) {
    return { reason: akamaiTitle, blocked: true };
  }

  if (preferAmazonGate(html, options.url)) {
    const amazon = matchMarker(lowerVisible, AMAZON_GATE_MARKERS, 'short-link-shell');
    if (amazon) {
      return { reason: amazon, blocked: true };
    }
    return { reason: 'short-link-shell:amazon-gate', blocked: true };
  }

  const bot = matchMarker(softHaystack, BOT_CHECK_MARKERS, 'bot-check');
  if (bot) {
    return { reason: bot, blocked: true };
  }

  // Amazon gate markers only on Amazon hosts (already handled above).
  return null;
}

function titleIndicatesBlock(title: string): string | null {
  const lowerTitle = title.toLowerCase();
  for (const marker of BOT_CHECK_MARKERS) {
    if (lowerTitle.includes(marker)) {
      return `bot-check:${marker}`;
    }
  }
  if (isGenericTitle(title)) {
    return 'generic-retailer-shell';
  }
  return null;
}

function attachQualityGate(
  base: ValidationResult,
  result: ExtractedMetadata,
  html: string,
  options: ValidateOptions
): ValidationResult {
  const confidence = base.confidence ?? 'low';
  const qualityGate = runQualityGate({
    metadata: result,
    html,
    confidence,
    validationValid: base.valid,
    validationReason: base.reason,
    blocked: base.blocked,
    titleFromSlug: options.titleFromSlug,
    httpStatus: options.httpStatus,
  });
  return { ...base, qualityGate };
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
    return attachQualityGate(
      { valid: false, reason: 'empty-or-short-html', confidence, fieldsFound },
      result,
      html,
      options
    );
  }

  const htmlBlock = htmlIndicatesBlock(html, visibleHtml, result, { url: options.url });
  if (htmlBlock) {
    return attachQualityGate(
      {
        valid: false,
        reason: htmlBlock.reason,
        blocked: htmlBlock.blocked,
        confidence,
        fieldsFound,
      },
      result,
      html,
      options
    );
  }

  const titleBlock = titleIndicatesBlock(result.title);
  if (titleBlock) {
    return attachQualityGate(
      { valid: false, reason: titleBlock, confidence, fieldsFound },
      result,
      html,
      options
    );
  }

  const hasTitle = Boolean(result.title?.trim());
  const hasDescription = Boolean(result.description?.trim());
  const hasPrice = result.price !== null;
  const hasImage = Boolean(result.imageUrl?.trim());

  if (mode === 'full') {
    if (!hasTitle) {
      return attachQualityGate(
        { valid: false, reason: 'missing-title-full', confidence, fieldsFound },
        result,
        html,
        options
      );
    }

    if (options.titleFromSlug && !hasPrice && !hasDescription) {
      return attachQualityGate(
        { valid: false, reason: 'slug-title-only', confidence: 'low', fieldsFound },
        result,
        html,
        options
      );
    }

    if (!hasPrice && !hasDescription) {
      return attachQualityGate(
        { valid: false, reason: 'missing-price-or-description-full', confidence, fieldsFound },
        result,
        html,
        options
      );
    }
  } else if (!hasImage && !hasPrice) {
    return attachQualityGate(
      { valid: false, reason: 'missing-critical-fields-minimal', confidence, fieldsFound },
      result,
      html,
      options
    );
  }

  return attachQualityGate({ valid: true, confidence, fieldsFound }, result, html, options);
}
