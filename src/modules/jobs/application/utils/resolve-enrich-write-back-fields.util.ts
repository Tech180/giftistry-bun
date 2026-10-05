import type { ItemDescriptionMetadata, ScrapeDiagnostics } from '@/modules/item';
import { resolveDesiredQuantity, sanitizeProductTitleForWrite } from '@/modules/item';
import { mergeGrabInfoMetadata } from './merge-grab-info-description.util';
import { mergePreferExtracted } from './merge-prefer-extracted.util';
import type { ResolveEnrichWriteBackFieldsInput } from '../interfaces/resolve-enrich-write-back-fields-input.interface';
import type { ResolveEnrichWriteBackFieldsResult } from '../interfaces/resolve-enrich-write-back-fields-result.interface';

function shouldProtectGiftTextFields(
  diagnostics: ScrapeDiagnostics,
  sanitizedTitle: string | null
): boolean {
  if (sanitizedTitle) {
    return false;
  }
  if (diagnostics.blocked) {
    return true;
  }
  if (diagnostics.needsReview) {
    return true;
  }
  if (diagnostics.validationReason === 'generic-retailer-shell') {
    return true;
  }
  if (diagnostics.qualityGate?.outcome === 'fail') {
    return true;
  }
  return false;
}

export function resolveEnrichWriteBackFields(
  input: ResolveEnrichWriteBackFieldsInput
): ResolveEnrichWriteBackFieldsResult {
  const { extract, diagnostics, current, fallbackUrl, finalUrl, websiteName } = input;
  const sanitizedTitle = sanitizeProductTitleForWrite(extract.title);
  const protectText = shouldProtectGiftTextFields(diagnostics, sanitizedTitle);

  const name = protectText
    ? current.name
    : mergePreferExtracted(sanitizedTitle, current.name, current.name);

  const packQty = resolveDesiredQuantity(
    extract.desiredQuantity,
    name,
    current.name,
    extract.title
  );

  let description = current.description ?? '';
  let metadata: ItemDescriptionMetadata | undefined = current.metadata ?? undefined;

  if (!protectText) {
    const merged = mergeGrabInfoMetadata(
      current.description,
      extract.description,
      extract.predefinedFields,
      extract.userDefinedFields,
      { desiredQuantity: packQty, existingMetadata: current.metadata ?? undefined }
    );
    description = merged.text ?? '';
    metadata = merged.metadata ?? undefined;
  }

  const category = protectText
    ? current.category
    : input.resolveCategory
      ? input.resolveCategory(extract.category)
      : mergePreferExtracted(extract.category, current.category, current.category ?? '');

  const price =
    extract.price != null ? extract.price : input.priceFallback === undefined ? undefined : input.priceFallback ?? undefined;
  const resolvedLinkUrl = finalUrl?.trim() || fallbackUrl;
  const resolvedWebsiteName =
    mergePreferExtracted(websiteName, null, '') || null;

  return {
    name,
    description,
    category,
    price,
    linkUrl: resolvedLinkUrl,
    websiteName: resolvedWebsiteName,
    metadata,
    imageUrl: extract.imageUrl,
  };
}
