import type { CategoryClassifier } from '../../domain/ports/category-classifier.port';
import type { CategoryClassificationResult } from '../../domain/interfaces/category-classification-result.interface';
import type { CategoryClassifierConfig } from '../../domain/interfaces/category-classifier-config.interface';
import type { CategoryClassifierInput } from '../../domain/interfaces/category-classifier-input.interface';
import { getDefaultAiPrompt } from '@/modules/system';
import { compileCategoryPrompt } from '../utils/compile-category-prompt.util';
import { parseCategoryJson } from '../utils/parse-category-json.util';
import { completeTextPromptStream } from '../utils/ai-text-completion.util';

export class AiCategoryClassifier implements CategoryClassifier {
  async classify(
    input: CategoryClassifierInput,
    config: CategoryClassifierConfig
  ): Promise<CategoryClassificationResult> {
    const template = config.customPrompt.trim() || getDefaultAiPrompt('category');
    const prompt = compileCategoryPrompt(template, input);
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

    return parseCategoryJson(result.text);
  }
}
