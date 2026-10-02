import { classifyPageType } from '../../../domain/utils/classify-page-type.util';
import type { QualityGateResult } from '../interfaces/quality-gate-result.interface';
import type { QualityGateInput } from '../interfaces/quality-gate-input.interface';

export function runQualityGate(input: QualityGateInput): QualityGateResult {
  const pageType = classifyPageType(input.html, { httpStatus: input.httpStatus });
  const meta = input.metadata;

  if (input.blocked) {
    return { outcome: 'fail', reason: 'blocked-signals', pageType };
  }

  if (!input.validationValid) {
    if (input.validationReason?.includes('bot-check') || input.validationReason?.includes('cloudflare')) {
      return { outcome: 'escalate', reason: 'blocked-signals', pageType };
    }
    if (pageType === 'error' || pageType === 'cart' || pageType === 'home') {
      return { outcome: 'fail', reason: 'non-product-page', pageType };
    }
    if (input.titleFromSlug && !meta.price && !meta.description?.trim()) {
      return { outcome: 'ai-assist', reason: 'slug-title-only', pageType };
    }
    return { outcome: 'ai-assist', reason: 'partial-fields', pageType };
  }

  const hasTitle = Boolean(meta.title?.trim());
  const hasPrice = meta.price != null;
  const hasImage = Boolean(meta.imageUrl?.trim());
  const hasDescription = Boolean(meta.description?.trim());

  if (!hasTitle) {
    return { outcome: 'fail', reason: 'missing-title', pageType };
  }

  if (pageType !== 'product' && pageType !== 'listing') {
    return { outcome: 'escalate', reason: 'non-product-page', pageType };
  }

  if (hasTitle && hasPrice && hasImage) {
    return { outcome: 'accept', reason: 'strong-product-page', pageType };
  }

  if (input.confidence === 'low') {
    return { outcome: 'ai-assist', reason: 'low-confidence', pageType };
  }

  if (hasTitle && (hasPrice || hasDescription || hasImage)) {
    return { outcome: 'accept', reason: 'partial-fields', pageType };
  }

  return { outcome: 'ai-assist', reason: 'partial-fields', pageType };
}
