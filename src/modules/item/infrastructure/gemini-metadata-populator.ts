import type { ExtractedMetadata } from '../domain/extracted-metadata';
import type {
  MetadataPopulator,
  MetadataPopulatorConfig,
  MetadataPopulatorInput,
} from '../domain/ports/metadata-populator.port';
import { completeTextPrompt } from './ai-text-completion';
import { getDefaultAiPrompt } from '@/modules/system/domain/ai-default-prompts';
import { assemblePopulateHubPrompt } from './populate-hub-prompt.util';
import { sanitizeProductDescription } from '../domain/sanitize-product-description.util';
import { fetchPageContext } from './http-page-context-fetcher';

export {
  fetchPageHtml,
  fetchPageContext,
  buildWebsiteNameHints,
  resolveWebsiteNameForUrl,
} from './http-page-context-fetcher';

export interface LinkedPopulatePrompts {
  descriptionPrompt?: string;
  categoryPrompt?: string;
}

const RECONCILE_RULES = `
Reconcile rules (critical — apply when web search context is provided):
- Compare Product page context (authoritative for price and official variant options) with Web search context (fills missing specs, cross-checks model numbers).
- Prefer product page data when both sources agree; use web search only to fill gaps or resolve conflicts.
- Price and official configuration options from the product page take precedence over third-party listings.
- Description must remain spec-free; put RAM, storage, color, size, and model details ONLY in PredefinedFields / UserDefinedFields.
`.trim();

function appendLinkedPromptSections(
  prompt: string,
  linked?: LinkedPopulatePrompts
): string {
  const descriptionPrompt =
    linked?.descriptionPrompt?.trim() || getDefaultAiPrompt('description');
  const categoryPrompt =
    linked?.categoryPrompt?.trim() || getDefaultAiPrompt('category');

  return assemblePopulateHubPrompt(prompt, descriptionPrompt, categoryPrompt);
}

export function compilePopulatePrompt(
  customPrompt: string,
  input: MetadataPopulatorInput,
  linked?: LinkedPopulatePrompts
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('populate');
  const searchContext = input.searchContext?.trim() || 'None';
  const resolved = template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{searchContext}/g, searchContext)
    .replace(/{itemName}/g, input.itemName || '');

  const withReconcile =
    input.reconcileSources && searchContext !== 'None'
      ? `${RECONCILE_RULES}\n\n${resolved}`
      : resolved;

  return appendLinkedPromptSections(withReconcile, linked);
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
  const priceRaw = parsed.Price;
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

  const predefinedFields = parseFieldMap(parsed.PredefinedFields);
  const userDefinedFields = parseFieldMap(parsed.UserDefinedFields);
  const color = str('Color');
  const size = str('Size');

  const qtyRaw = parsed.DesiredQuantity;
  let desiredQuantity: number | null = null;
  if (typeof qtyRaw === 'number' && Number.isFinite(qtyRaw)) {
    desiredQuantity = Math.floor(qtyRaw);
  } else if (typeof qtyRaw === 'string' && qtyRaw.trim()) {
    const n = Number.parseInt(qtyRaw.trim(), 10);
    desiredQuantity = Number.isFinite(n) ? n : null;
  }
  if (desiredQuantity != null && (desiredQuantity < 2 || desiredQuantity > 99)) {
    desiredQuantity = null;
  }

  return {
    title: str('Title') || '',
    price,
    description: sanitizeProductDescription(str('Description'), {
      predefinedFields,
      userDefinedFields,
      color,
      size,
    }),
    color,
    size,
    category: null,
    imageUrl: str('ImageUrl'),
    predefinedFields,
    userDefinedFields,
    desiredQuantity,
  };
}

export class GeminiMetadataPopulator implements MetadataPopulator {
  async populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata> {
    const pageContext = input.pageContext ?? (await fetchPageContext(input.url));
    const prompt = compilePopulatePrompt(
      config.customPrompt,
      {
        ...input,
        pageContext,
      },
      {
        descriptionPrompt: config.linkedDescriptionPrompt,
        categoryPrompt: config.linkedCategoryPrompt,
      }
    );

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

// Re-export domain-layer business logic for backward compatibility.
export {
  mergeFieldMaps,
  mergeExtractedMetadata,
  isVerboseProductTitle,
  isVerboseMarketingDescription,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../domain/merge-extracted-metadata';
