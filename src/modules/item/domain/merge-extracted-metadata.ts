import type { ExtractedMetadata } from './extracted-metadata';
import { coerceApparelSizeFields } from './coerce-apparel-size-fields.util';
import { resolveDesiredQuantity } from './parse-pack-quantity.util';
import { isUnusableProductDescription } from './product-description.util';
import { sanitizeProductDescription } from './sanitize-product-description.util';

export function isVerboseMarketingDescription(text: string | null | undefined): boolean {
  return isUnusableProductDescription(text);
}

export function mergeFieldMaps(
  scrapeFields: Record<string, string> | undefined,
  aiFields: Record<string, string> | undefined,
  preferScrape: boolean
): Record<string, string> {
  const result = { ...(scrapeFields ?? {}) };
  for (const [key, val] of Object.entries(aiFields ?? {})) {
    if (!val.trim()) continue;
    if (preferScrape && result[key]?.trim()) continue;
    result[key] = val.trim();
  }
  return result;
}

export function mergeExtractedMetadata(
  scrape: ExtractedMetadata,
  ai: ExtractedMetadata,
  preferScrape: boolean,
  options: { url?: string; scrapeApparelSizeKey?: string | null } = {}
): ExtractedMetadata {
  const pick = (scrapeVal: string | null, aiVal: string | null, scrapeField = true) => {
    if (preferScrape && scrapeVal?.trim()) return scrapeVal.trim();
    if (aiVal?.trim()) return aiVal.trim();
    return scrapeVal?.trim() || null;
  };

  const pickTitle = () => {
    const isScrapeVerbose = isVerboseProductTitle(scrape.title);
    if (preferScrape && scrape.title.trim() && !isScrapeVerbose) {
      return scrape.title.trim();
    }
    if (ai.title.trim()) return ai.title.trim();
    return scrape.title.trim() || '';
  };

  const pickDescription = () => {
    const aiDescription = sanitizeProductDescription(ai.description, {
      predefinedFields: { ...scrape.predefinedFields, ...ai.predefinedFields },
      userDefinedFields: { ...scrape.userDefinedFields, ...ai.userDefinedFields },
      color: pick(scrape.color, ai.color, preferScrape),
      size: pick(scrape.size, ai.size, preferScrape),
    });
    if (aiDescription) return aiDescription;

    const scrapeDescription = scrape.description?.trim();
    if (scrapeDescription && isVerboseMarketingDescription(scrapeDescription)) {
      return null;
    }

    const sanitizedScrape = sanitizeProductDescription(scrapeDescription, {
      predefinedFields: scrape.predefinedFields,
      userDefinedFields: scrape.userDefinedFields,
      color: scrape.color,
      size: scrape.size,
    });

    if (preferScrape && sanitizedScrape) return sanitizedScrape;
    return sanitizedScrape || null;
  };

  const scrapePrice = scrape.price;
  const aiPrice = ai.price;

  const mergedPredefined = mergeFieldMaps(
    scrape.predefinedFields,
    ai.predefinedFields,
    preferScrape
  );
  const title = pickTitle();
  const size = pick(scrape.size, ai.size, preferScrape);
  const category = pick(scrape.category, ai.category, preferScrape);
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
    price: preferScrape && scrapePrice != null ? scrapePrice : (aiPrice ?? scrapePrice),
    description: pickDescription(),
    color: pick(scrape.color, ai.color, preferScrape),
    size,
    category,
    imageUrl: pick(scrape.imageUrl, ai.imageUrl, preferScrape),
    predefinedFields: coercedPredefined,
    userDefinedFields: mergeFieldMaps(scrape.userDefinedFields, ai.userDefinedFields, preferScrape),
    desiredQuantity,
  };
}

export function isVerboseProductTitle(title: string | null | undefined): boolean {
  const t = title?.trim() ?? '';
  if (!t) return false;
  if (t.length > 80) return true;
  const dashParts = t.split(/\s[-–—|]\s/);
  if (dashParts.length >= 3) return true;
  return false;
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
