import type { ExtractedMetadata } from '../domain/extracted-metadata';
import type {
  MetadataPopulator,
  MetadataPopulatorConfig,
  MetadataPopulatorInput,
} from '../domain/ports/metadata-populator.port';
import { completeTextPromptStream } from './ai-text-completion';
import { getDefaultAiPrompt } from '@/modules/system/domain/prompts';
import { assemblePopulateHubPrompt } from './populate-hub-prompt.util';
import { sanitizeProductDescription } from '../domain/sanitize-product-description.util';
import { promoteProseCustomFieldsToDescription } from '../domain/promote-prose-custom-fields-to-description.util';
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

/** Short guidance for the JSON Description field — never the wishlist-notes prompt. */
const POPULATE_DESCRIPTION_FIELD_GUIDANCE = `
The JSON "Description" value must be 1–2 plain sentences about what the product is and its primary use.
Put that copy ONLY in "Description" — never in PredefinedFields / UserDefinedFields keys such as Note, Notes, Summary, Features, BestGiftFor, or Overview.
Custom fields are for structured attributes only (Brand, ModelNumber, Color, Size, RAM, StorageCapacity, etc.).
`.trim();

const POPULATE_JSON_ONLY_FOOTER = `
=== Output Contract (critical) ===
Return ONE JSON object matching the populate schema above.
- "Title" is REQUIRED and must be a short gift-list name (brand + model + short type when helpful). Never omit Title. Never copy the full marketplace SEO title.
- "Description" is REQUIRED when page context has product copy — put it in the top-level Description field only.
- Put Brand only under UserDefinedFields.Brand (not a top-level Brand key). Put other attributes only under PredefinedFields / UserDefinedFields as string values (never arrays).
- Do not invent Note / Notes / Summary / Features / BestGiftFor fields for product prose.
- Use Category-section guidance only if helpful for fields; do not emit a separate category response.
- Do not ask for missing placeholders. Product URL, name, category, store, and page context are already provided above.
- Output raw JSON only. No markdown fences, no preamble, no follow-up questions.
`.trim();

function applyPopulateTemplateTokens(
  template: string,
  input: MetadataPopulatorInput,
  searchContext: string
): string {
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{searchContext}/g, searchContext)
    .replace(/{itemName}/g, input.itemName || '')
    .replace(/{category}/g, input.category || '')
    .replace(/{existingNotes}/g, '')
    .replace(/{itemContext}/g, input.pageContext || 'None provided')
    .replace(/{existingCategories}/g, '')
    .replace(/{price}/g, '');
}

function appendLinkedPromptSections(
  prompt: string,
  linked: LinkedPopulatePrompts | undefined,
  input: MetadataPopulatorInput,
  searchContext: string
): string {
  // Never append AiDescriptionPrompt (wishlist notes) — it steers models to put
  // prose in Note/Features instead of JSON Description.
  const descriptionPrompt = POPULATE_DESCRIPTION_FIELD_GUIDANCE;
  const categoryPrompt = applyPopulateTemplateTokens(
    linked?.categoryPrompt?.trim() || getDefaultAiPrompt('category'),
    input,
    searchContext
  );

  return `${assemblePopulateHubPrompt(prompt, descriptionPrompt, categoryPrompt)}\n\n${POPULATE_JSON_ONLY_FOOTER}`;
}

export function compilePopulatePrompt(
  customPrompt: string,
  input: MetadataPopulatorInput,
  linked?: LinkedPopulatePrompts
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('populate');
  const searchContext = input.searchContext?.trim() || 'None';
  const resolved = applyPopulateTemplateTokens(template, input, searchContext);

  const withReconcile =
    input.reconcileSources && searchContext !== 'None'
      ? `${RECONCILE_RULES}\n\n${resolved}`
      : resolved;

  return appendLinkedPromptSections(withReconcile, linked, input, searchContext);
}

/** Exported for unit tests — pulls the first JSON object from model prose. */
export function extractFirstJsonObject(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '');
    clean = clean.replace(/\s*```$/, '');
    clean = clean.trim();
  }

  if (clean.startsWith('{')) return clean;

  const start = clean.indexOf('{');
  if (start === -1) return clean;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const ch = clean[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return clean.slice(start, i + 1);
    }
  }

  return clean.slice(start);
}

function parseFieldMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) {
      result[key] = val.trim();
      continue;
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
      result[key] = String(val);
      continue;
    }
    if (Array.isArray(val)) {
      const joined = val
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .join(', ');
      if (joined) result[key] = joined;
    }
  }
  return result;
}

function parsePopulateJson(text: string): ExtractedMetadata {
  const clean = extractFirstJsonObject(text);
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
  const topLevelBrand = str('Brand');
  if (topLevelBrand && !userDefinedFields.Brand) {
    userDefinedFields.Brand = topLevelBrand;
  }
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

  const promoted = promoteProseCustomFieldsToDescription({
    title: str('Title') || '',
    price,
    description: str('Description'),
    color,
    size,
    category: null,
    imageUrl: str('ImageUrl'),
    predefinedFields,
    userDefinedFields,
    desiredQuantity,
  });

  return {
    ...promoted,
    description: sanitizeProductDescription(promoted.description, {
      predefinedFields: promoted.predefinedFields,
      userDefinedFields: promoted.userDefinedFields,
      color: promoted.color,
      size: promoted.size,
    }),
  };
}

/** Test helper — same path as live populate JSON parsing. */
export function parsePopulateJsonForTests(text: string): ExtractedMetadata {
  return parsePopulateJson(text);
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

    const result = await completeTextPromptStream(
      prompt,
      {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        endpoint: config.endpoint,
        jsonResponse: true,
      },
      async (delta) => {
        await config.onDelta?.({ tokensPerSecond: delta.tokensPerSecond });
      }
    );

    return parsePopulateJson(result.text);
  }
}

// Re-export domain-layer business logic for backward compatibility.
export {
  mergeFieldMaps,
  mergeExtractedMetadata,
  isVerboseProductTitle,
  isVerboseMarketingDescription,
  isEmptyAiPopulateResult,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../domain/merge-extracted-metadata';
