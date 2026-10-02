import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import { coerceApparelSizeFields } from './coerce-apparel-size-fields.util';
import { isVerboseProductTitle } from './is-verbose-product-title.util';
import { normalizeGiftFacingTitle } from './normalize-gift-facing-title.util';
import { mergeFieldMapsByNormalizedKey } from './collapse-custom-field-maps.util';
import { resolveDesiredQuantity } from './parse-pack-quantity.util';
import { isUnusableProductDescription } from './product-description.util';
import { sanitizeProductDescription } from './sanitize-product-description.util';

export function mergeFieldMaps(
  scrapeFields: Record<string, string> | undefined,
  aiFields: Record<string, string> | undefined,
  preferScrape: boolean
): Record<string, string> {
  return mergeFieldMapsByNormalizedKey(scrapeFields, aiFields, preferScrape);
}

export function mergeExtractedMetadata(
  scrape: ExtractedMetadata,
  ai: ExtractedMetadata,
  preferScrape: boolean,
  options: {
    url?: string;
    scrapeApparelSizeKey?: string | null;
    evidenceText?: string | null;
  } = {}
): ExtractedMetadata {
  /** AI-first for gift-facing text/attributes; scrape fills gaps. */
  const pickAiFirst = (scrapeVal: string | null, aiVal: string | null) => {
    if (aiVal?.trim()) return aiVal.trim();
    return scrapeVal?.trim() || null;
  };

  const evidence = options.evidenceText;
  const groundedInEvidence = (value: string | null | undefined): boolean => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return false;
    }
    // When callers omit evidenceText, keep legacy AI-first attribute behavior.
    if (evidence === undefined) {
      return true;
    }
    if (!evidence) {
      return false;
    }
    return evidence.toLowerCase().includes(trimmed.toLowerCase());
  };

  const pickGroundedAttr = (scrapeVal: string | null, aiVal: string | null) => {
    if (aiVal?.trim() && groundedInEvidence(aiVal)) {
      return aiVal.trim();
    }
    return scrapeVal?.trim() || null;
  };

  const pickTitle = () => normalizeGiftFacingTitle(ai.title.trim() || scrape.title);

  const color = pickGroundedAttr(scrape.color, ai.color);
  const size = pickGroundedAttr(scrape.size, ai.size);

  const pickDescription = () => {
    const aiDescription = sanitizeProductDescription(ai.description, {
      predefinedFields: { ...scrape.predefinedFields, ...ai.predefinedFields },
      userDefinedFields: { ...scrape.userDefinedFields, ...ai.userDefinedFields },
      color,
      size,
    });
    if (aiDescription && !isUnusableProductDescription(aiDescription)) {
      return aiDescription;
    }

    const scrapeDescription = scrape.description?.trim();
    if (scrapeDescription && isUnusableProductDescription(scrapeDescription)) {
      return null;
    }

    return sanitizeProductDescription(scrapeDescription, {
      predefinedFields: scrape.predefinedFields,
      userDefinedFields: scrape.userDefinedFields,
      color: scrape.color,
      size: scrape.size,
    });
  };

  const scrapePrice = scrape.price;
  const aiPrice = ai.price;
  // Scraper wins at any confidence when it has a price.
  const price = scrapePrice ?? aiPrice;

  const pickImage = () => {
    if (scrape.imageUrl?.trim()) {
      return scrape.imageUrl.trim();
    }
    const aiImage = ai.imageUrl?.trim() || null;
    if (!aiImage) {
      return null;
    }
    if (!/^https?:\/\//i.test(aiImage)) {
      return null;
    }
    if (evidence === undefined) {
      return aiImage;
    }
    if (evidence && evidence.includes(aiImage)) {
      return aiImage;
    }
    return null;
  };

  // Attributes are always AI-first when grounded; preferScrape kept for callers.
  void preferScrape;
  const mergedPredefined = mergeFieldMaps(scrape.predefinedFields, ai.predefinedFields, false);
  const title = pickTitle();
  const category = pickAiFirst(scrape.category, ai.category);
  const scrapeKey = options.scrapeApparelSizeKey;
  const coercedPredefined = coerceApparelSizeFields({
    predefinedFields: mergedPredefined,
    url: options.url || '',
    title,
    category,
    size,
    scrapePreferredKey:
      scrapeKey === 'ShirtSize' ||
      scrapeKey === 'PantsSize' ||
      scrapeKey === 'ShoesSize' ||
      scrapeKey === 'SocksSize'
        ? scrapeKey
        : null,
  });

  const desiredQuantity = resolveDesiredQuantity(
    ai.desiredQuantity ?? scrape.desiredQuantity,
    title,
    scrape.title,
    ai.title
  );

  return {
    title,
    price,
    description: pickDescription(),
    color,
    size,
    category,
    imageUrl: pickImage(),
    predefinedFields: coercedPredefined,
    userDefinedFields: mergeFieldMaps(scrape.userDefinedFields, ai.userDefinedFields, false),
    desiredQuantity,
  };
}

export function isEmptyAiPopulateResult(ai: ExtractedMetadata): boolean {
  const hasTitle = Boolean(ai.title?.trim());
  const hasDescription = Boolean(ai.description?.trim());
  const hasPrice = ai.price != null;
  const hasColor = Boolean(ai.color?.trim());
  const hasSize = Boolean(ai.size?.trim());
  const hasImage = Boolean(ai.imageUrl?.trim());
  const predefinedCount = Object.keys(ai.predefinedFields ?? {}).length;
  const userDefinedCount = Object.keys(ai.userDefinedFields ?? {}).length;

  return (
    !hasTitle &&
    !hasDescription &&
    !hasPrice &&
    !hasColor &&
    !hasSize &&
    !hasImage &&
    predefinedCount === 0 &&
    userDefinedCount === 0
  );
}

export function shouldAiPopulate(
  scrapeResult: { data: ExtractedMetadata; diagnostics: { confidence: string; blocked?: boolean; fieldsFound?: string[] } },
  aiEnabled: boolean
): boolean {
  if (!aiEnabled) return false;

  const { data, diagnostics } = scrapeResult;
  if (diagnostics.blocked) return true;
  if (diagnostics.confidence === 'low') return true;
  if (!data.title?.trim()) return true;

  const fieldsFound = diagnostics.fieldsFound ?? [];
  if (fieldsFound.length < 2) return true;

  const missingCore =
    data.price == null &&
    !data.description?.trim() &&
    !data.color?.trim() &&
    !data.size?.trim();

  return missingCore;
}

function hasPredefinedSize(pre: Record<string, string>): boolean {
  return Boolean(
      pre.ShirtSize?.trim() ||
      pre.PantsSize?.trim() ||
      pre.ShoesSize?.trim() ||
      pre.SocksSize?.trim()
  );
}

function missingApparelSize(data: ExtractedMetadata): boolean {
  const pre = data.predefinedFields ?? {};
  const hasSize = Boolean(data.size?.trim() || hasPredefinedSize(pre));
  if (hasSize) return false;

  const text = `${data.title ?? ''} ${data.category ?? ''}`.toLowerCase();
  return /shirt|tee|t-shirt|hoodie|pant|jeans|shoe|sneaker|boot|sock|apparel|clothing/.test(text);
}

export function shouldRunAiPopulate(
  scrapeResult: { data: ExtractedMetadata; diagnostics: { confidence: string; blocked?: boolean; fieldsFound?: string[] } },
  scrapeWithFields: ExtractedMetadata,
  aiEnabled: boolean
): boolean {
  if (!aiEnabled) return false;
  if (shouldAiPopulate(scrapeResult, true)) return true;
  if (isVerboseProductTitle(scrapeWithFields.title)) return true;

  const predefinedCount = Object.keys(scrapeWithFields.predefinedFields ?? {}).length;
  const userDefinedCount = Object.keys(scrapeWithFields.userDefinedFields ?? {}).length;
  if (predefinedCount + userDefinedCount === 0) return true;
  if (missingApparelSize(scrapeWithFields)) return true;

  const userDefined = scrapeWithFields.userDefinedFields ?? {};
  if (!userDefined.Material?.trim() && scrapeWithFields.description?.trim()) return true;

  // Scrape may only map color/size into predefined — still run AI for user-defined attributes.
  return userDefinedCount === 0;
}
