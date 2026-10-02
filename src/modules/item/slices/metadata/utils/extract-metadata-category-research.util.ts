import type { CategoryClassifier } from '../../../domain/ports/category-classifier.port';
import type { ProductResearcher } from '../../../domain/ports/product-researcher.port';
import type { ExtractMetadataProgress } from '../interfaces/extract-metadata-progress.interface';
import type { AiMetadataExtractionOptions, ServerConfig } from '@/modules/system';
import { normalizeCategoryLabel } from '../../../domain/utils/normalize-category-label.util';
import { parseAmazonAsinFromUrl } from '../../../domain/utils/amazon-url.util';
import type { CategoryClassifierConfig } from '../../../domain/interfaces/category-classifier-config.interface';
import type { CategoryResearchStageInput } from '../interfaces/category-research-stage-input.interface';
import type { CategoryResearchStageResult } from '../interfaces/category-research-stage-result.interface';
import type { CategoryClassificationResult } from '../../../domain/interfaces/category-classification-result.interface';

export async function runCategoryAndResearchStage(
  input: CategoryResearchStageInput,
  deps: {
    categoryClassifier: CategoryClassifier;
    productResearcher: ProductResearcher | undefined;
    categoryConfig: CategoryClassifierConfig;
    onProgress: (update: ExtractMetadataProgress) => Promise<void>;
  }
): Promise<CategoryResearchStageResult> {
  let aiCategoryResult: CategoryClassificationResult = {
    category: normalizeCategoryLabel(input.fallbackCategory || 'uncategorized'),
    alternatives: [],
  };

  const categoryPromise = (async () => {
    await deps.onProgress({ phase: 'categorizing' });
    return deps.categoryClassifier.classify(
      {
        url: input.resolvedUrl,
        websiteName: input.websiteName,
        pageContext: input.pageContext,
        itemName: input.itemTitle,
        existingCategories: input.existingCategories,
      },
      deps.categoryConfig
    );
  })();

  const researchPromise =
    input.enableWebSearch && deps.productResearcher
      ? (async () => {
          await deps.onProgress({ phase: 'researching' });
          return deps.productResearcher!.research({
            itemName: input.itemTitle || parseAmazonAsinFromUrl(input.resolvedUrl) || '',
            websiteName: input.websiteName,
            url: input.resolvedUrl,
          });
        })()
      : Promise.resolve('None');

  const [categoryOutcome, researchOutcome] = await Promise.allSettled([
    categoryPromise,
    researchPromise,
  ]);

  if (categoryOutcome.status === 'fulfilled') {
    aiCategoryResult = categoryOutcome.value;
  } else {
    console.error('[AI Category] Failed to classify item:', categoryOutcome.reason);
  }

  let searchContext: string | undefined;
  if (researchOutcome.status === 'fulfilled') {
    const researched = researchOutcome.value;
    if (researched.trim() && researched.trim() !== 'None') {
      searchContext = researched;
    }
  } else {
    console.error('[Web Search] Failed to research product:', researchOutcome.reason);
  }

  return { aiCategoryResult, searchContext };
}

export function buildCategoryClassifierConfig(
  config: ServerConfig,
  fastConnection: ReturnType<
    typeof import('@/common/utils/resolve-ai-connection.util').resolveAiConnection
  >,
  extraction: AiMetadataExtractionOptions,
  onDelta: CategoryClassifierConfig['onDelta'],
  timeoutMs?: number
): CategoryClassifierConfig {
  const { provider, apiKey, model, endpoint } = fastConnection;
  return {
    provider,
    apiKey,
    model,
    customPrompt: config.AiCategoryPrompt || '',
    endpoint,
    extractionOptions: extraction,
    onDelta,
    ...(timeoutMs != null ? { timeoutMs } : {}),
  };
}
