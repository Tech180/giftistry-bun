import type { ExtractedMetadata, ScrapeMode } from '../../domain/extracted-metadata';
import { isGenericTitle } from './parser';

const CLOUDFLARE_MARKERS = [
  'cf-browser-verification',
  'challenge-platform',
  'just a moment',
  'checking your browser',
];

const BOT_CHECK_MARKERS = ['robot check', 'captcha', 'access denied'];

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

function htmlIndicatesBlock(html: string): string | null {
  const lowerHtml = html.toLowerCase();
  for (const marker of CLOUDFLARE_MARKERS) {
    if (lowerHtml.includes(marker)) return `cloudflare:${marker}`;
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

export function validateScrapeResult(
  result: ExtractedMetadata,
  html: string,
  mode: ScrapeMode
): ValidationResult {
  if (!html || html.length < 500) {
    return { valid: false, reason: 'empty-or-short-html' };
  }

  const cloudflare = htmlIndicatesBlock(html);
  if (cloudflare) {
    return { valid: false, reason: cloudflare };
  }

  const titleBlock = titleIndicatesBlock(result.title);
  if (titleBlock) {
    return { valid: false, reason: titleBlock };
  }

  if (mode === 'full') {
    const hasTitle = Boolean(result.title?.trim());
    const hasDescription = Boolean(result.description?.trim());
    const hasPrice = result.price !== null;
    if (!hasTitle && !hasDescription && !hasPrice) {
      return { valid: false, reason: 'missing-critical-fields-full' };
    }
  } else {
    const hasImage = Boolean(result.imageUrl?.trim());
    const hasPrice = result.price !== null;
    if (!hasImage && !hasPrice) {
      return { valid: false, reason: 'missing-critical-fields-minimal' };
    }
  }

  return { valid: true };
}
