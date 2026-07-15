import type {
  CategoryClassificationResult,
  CategoryClassifier,
  CategoryClassifierConfig,
  CategoryClassifierInput,
} from '../domain/ports/category-classifier.port';
import { completeTextPrompt } from './ai-text-completion';
import { getDefaultAiPrompt } from '@/modules/system/domain/ai-default-prompts';

export function compileCategoryPrompt(
  customPrompt: string,
  input: CategoryClassifierInput
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('category');
  const existing =
    input.existingCategories?.filter((c) => c?.trim() && c !== 'uncategorized').join(', ') ||
    '';
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{itemName}/g, input.itemName || '')
    .replace(/{existingCategories}/g, existing);
}

import { normalizeCategoryLabel } from '../domain/normalize-category-label.util';

// Re-export for backward compatibility
export { normalizeCategoryLabel } from '../domain/normalize-category-label.util';

export function parseCategoryAlternatives(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const alternatives: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const normalized = normalizeCategoryLabel(entry);
    if (normalized === 'uncategorized' || seen.has(normalized)) continue;
    seen.add(normalized);
    alternatives.push(normalized);
    if (alternatives.length >= 2) break;
  }

  return alternatives;
}

export function parseCategoryJson(text: string): CategoryClassificationResult {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/i, '');
    clean = clean.replace(/```$/, '');
    clean = clean.trim();
  }

  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const category =
    typeof parsed.Category === 'string'
      ? normalizeCategoryLabel(parsed.Category)
      : 'uncategorized';
  const alternatives = parseCategoryAlternatives(parsed.Alternatives).filter(
    (alt) => alt !== category
  );

  return { category, alternatives };
}

export class GeminiCategoryClassifier implements CategoryClassifier {
  async classify(
    input: CategoryClassifierInput,
    config: CategoryClassifierConfig
  ): Promise<CategoryClassificationResult> {
    const prompt = compileCategoryPrompt(config.customPrompt, input);
    const text = await completeTextPrompt(prompt, {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      endpoint: config.endpoint,
      jsonResponse: true,
    });

    return parseCategoryJson(text);
  }
}
