import type { ExtractedMetadata } from '../domain/extracted-metadata';
import type {
  MetadataPopulator,
  MetadataPopulatorConfig,
  MetadataPopulatorInput,
} from '../domain/ports/metadata-populator.port';
import { completeTextPrompt } from './ai-text-completion';
import { getDefaultAiPrompt } from './ai-default-prompts';
import { buildJsonLdPageContext } from './scraping/extractors/json-ld-product.util';

export function compilePopulatePrompt(
  customPrompt: string,
  input: MetadataPopulatorInput
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('populate');
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{itemName}/g, input.itemName || '');
}

function parseFieldMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) {
      result[key] = val.trim();
    }
  }
  return result;
}

function parsePopulateJson(text: string): ExtractedMetadata {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/i, '');
    clean = clean.replace(/```$/, '');
    clean = clean.trim();
  }

  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const priceRaw = parsed.price;
  let price: number | null = null;
  if (typeof priceRaw === 'number' && !Number.isNaN(priceRaw)) {
    price = priceRaw;
  } else if (typeof priceRaw === 'string') {
    const num = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
    price = Number.isNaN(num) ? null : num;
  }

  const str = (key: string) => {
    const val = parsed[key];
    return typeof val === 'string' && val.trim() ? val.trim() : null;
  };

  return {
    title: str('title') || '',
    price,
    description: str('description'),
    color: str('color'),
    size: str('size'),
    category: null,
    imageUrl: str('imageUrl'),
    predefinedFields: parseFieldMap(parsed.predefinedFields),
    userDefinedFields: parseFieldMap(parsed.userDefinedFields),
  };
}

export async function fetchPageContext(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return buildJsonLdPageContext(html, url);
  } catch {
    return '';
  }
}

export class GeminiMetadataPopulator implements MetadataPopulator {
  async populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata> {
    const pageContext = input.pageContext ?? (await fetchPageContext(input.url));
    const prompt = compilePopulatePrompt(config.customPrompt, {
      ...input,
      pageContext,
    });

    const text = await completeTextPrompt(prompt, {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      endpoint: config.endpoint,
      jsonResponse: true,
    });

    return parsePopulateJson(text);
  }
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
  preferScrape: boolean
): ExtractedMetadata {
  const pick = (scrapeVal: string | null, aiVal: string | null, scrapeField = true) => {
    if (preferScrape && scrapeVal?.trim()) return scrapeVal.trim();
    if (aiVal?.trim()) return aiVal.trim();
    return scrapeVal?.trim() || null;
  };

  const pickTitle = () => {
    if (ai.title.trim()) return ai.title.trim();
    if (preferScrape && scrape.title.trim()) return scrape.title.trim();
    return scrape.title.trim() || '';
  };

  const scrapePrice = scrape.price;
  const aiPrice = ai.price;

  return {
    title: pickTitle(),
    price: preferScrape && scrapePrice != null ? scrapePrice : (aiPrice ?? scrapePrice),
    description: pick(scrape.description, ai.description, preferScrape),
    color: pick(scrape.color, ai.color, preferScrape),
    size: pick(scrape.size, ai.size, preferScrape),
    category: pick(scrape.category, ai.category, preferScrape),
    imageUrl: pick(scrape.imageUrl, ai.imageUrl, preferScrape),
    predefinedFields: mergeFieldMaps(scrape.predefinedFields, ai.predefinedFields, preferScrape),
    userDefinedFields: mergeFieldMaps(scrape.userDefinedFields, ai.userDefinedFields, preferScrape),
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
      pre.SocksSize?.trim() ||
      pre.shirtSize?.trim() ||
      pre.pantsSize?.trim() ||
      pre.shoesSize?.trim() ||
      pre.socksSize?.trim()
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
