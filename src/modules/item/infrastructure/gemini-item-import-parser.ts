import type {
  ItemImportParser,
  ItemImportParserConfig,
  ItemImportParserInput,
} from '../domain/ports/item-import-parser.port';
import type { ImportedItemPreview } from '../domain/imported-item-preview';
import { normalizeImportedItem, parsePriceValue } from '../domain/giftistry-export-detect';
import { completeTextPrompt } from './ai-text-completion';
import { getDefaultAiPrompt } from '@/modules/system/domain/ai-default-prompts';

export function compileImportPrompt(
  customPrompt: string,
  input: ItemImportParserInput
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('import');
  return template
    .replace(/{fileName}/g, input.fileName || '')
    .replace(/{format}/g, input.format || 'unknown')
    .replace(/{wishlistTitle}/g, input.wishlistTitle || '')
    .replace(/{existingCategories}/g, input.existingCategories || '')
    .replace(/{fileContent}/g, input.fileContent || '');
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('AI import response was not valid JSON');
  }
}

export function mapAiImportItems(payload: unknown): ImportedItemPreview[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as { Items?: unknown };
  if (!Array.isArray(record.Items)) {
    return [];
  }

  const items: ImportedItemPreview[] = [];
  for (const raw of record.Items) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const normalized = normalizeImportedItem({
      name: typeof row.Name === 'string' ? row.Name : undefined,
      category: typeof row.Category === 'string' ? row.Category : undefined,
      priority:
        row.Priority !== undefined && row.Priority !== null ? Number(row.Priority) : undefined,
      description: typeof row.Description === 'string' ? row.Description : undefined,
      price: parsePriceValue(row.Price),
      websiteLink:
        typeof row.WebsiteLink === 'string'
          ? row.WebsiteLink
          : typeof row.Url === 'string'
            ? row.Url
            : undefined,
      isFavorite: row.IsFavorite === true,
      color: typeof row.Color === 'string' ? row.Color : undefined,
      size: typeof row.Size === 'string' ? row.Size : undefined,
      desiredQuantity:
        row.DesiredQuantity !== undefined && row.DesiredQuantity !== null
          ? Number(row.DesiredQuantity)
          : undefined,
    });
    if (normalized) {
      items.push(normalized);
    }
  }
  return items;
}

export class GeminiItemImportParser implements ItemImportParser {
  async parse(
    input: ItemImportParserInput,
    config: ItemImportParserConfig
  ): Promise<ImportedItemPreview[]> {
    const prompt = compileImportPrompt(config.customPrompt, input);
    const text = await completeTextPrompt(prompt, {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      endpoint: config.endpoint,
      jsonResponse: true,
    });
    const parsed = extractJsonObject(text);
    return mapAiImportItems(parsed);
  }
}
