import type {
  CategoryClassifier,
  CategoryClassifierConfig,
  CategoryClassifierInput,
} from '../domain/ports/category-classifier.port';
import { completeTextPrompt } from './ai-text-completion';
import { getDefaultAiPrompt } from './ai-default-prompts';

export function compileCategoryPrompt(
  customPrompt: string,
  input: CategoryClassifierInput
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('category');
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{itemName}/g, input.itemName || '');
}

export function normalizeCategoryLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'uncategorized';
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'uncategorized';
}

export function parseCategoryJson(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?/i, '');
    clean = clean.replace(/```$/, '');
    clean = clean.trim();
  }

  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const category = parsed.category;
  if (typeof category === 'string') {
    return normalizeCategoryLabel(category);
  }
  return 'uncategorized';
}

export class GeminiCategoryClassifier implements CategoryClassifier {
  async classify(
    input: CategoryClassifierInput,
    config: CategoryClassifierConfig
  ): Promise<string> {
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
