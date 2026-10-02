import type { ServerConfig } from '@/modules/system';
import {
  catalogForConfig,
  composePopulateWithPacks,
  resolveMetadataPacks,
  sanitizeEnabledPackIdsForConfig,
  type AiMetadataExtractionOptions,
} from '@/modules/system';
import type { MetadataPopulator } from '../../../domain/ports/metadata-populator.port';
import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { MetadataPopulatorConfig } from '../../../domain/interfaces/metadata-populator-config.interface';
import {
  mergeExtractedMetadata,
  isEmptyAiPopulateResult,
} from '../../../domain/utils/merge-extracted-metadata.util';
import { groundAiFields } from '../../../domain/utils/ground-ai-fields.util';
import { resolveDesiredQuantity } from '../../../domain/utils/parse-pack-quantity.util';
import type { ExtractMetadataProgress } from '../interfaces/extract-metadata-progress.interface';
import type { ExtractPopulateStageInput } from '../interfaces/extract-populate-stage-input.interface';
import type { ExtractPopulateStageOutcome } from '../types/extract-populate-stage-outcome.type';

export async function runExtractPopulateStage(
  input: ExtractPopulateStageInput,
  deps: {
    config: ServerConfig;
    extraction: AiMetadataExtractionOptions;
    metadataPopulator: MetadataPopulator;
    populatorConfig: Omit<MetadataPopulatorConfig, 'customPrompt' | 'packs'>;
    onProgress: (update: ExtractMetadataProgress) => Promise<void>;
  }
): Promise<ExtractPopulateStageOutcome> {
  await deps.onProgress({ phase: 'populating' });

  const catalog = catalogForConfig(deps.config);
  const enabledPackIds = sanitizeEnabledPackIdsForConfig(deps.config);
  const packs = resolveMetadataPacks({
    enabledPackIds,
    category: input.resolvedCategory,
    itemName: input.scrapeWithFields.title || '',
    catalog,
  });

  const customPrompt = deps.extraction.splitCalls
    ? deps.config.AiPopulatePrompt || ''
    : composePopulateWithPacks(deps.config.AiPopulatePrompt || '', packs);

  const aiRaw = await deps.metadataPopulator.populate(
    {
      url: input.resolvedUrl,
      websiteName: input.websiteName,
      pageContext: input.pageContext,
      searchContext: input.searchContext,
      itemName: input.scrapeWithFields.title || '',
      category: input.resolvedCategory,
      reconcileSources: Boolean(input.searchContext),
    },
    {
      ...deps.populatorConfig,
      customPrompt,
      packs: deps.extraction.splitCalls ? packs : undefined,
    }
  );

  if (isEmptyAiPopulateResult(aiRaw)) {
    return { kind: 'empty' };
  }

  const evidenceText = [input.pageContext, input.searchContext].filter(Boolean).join('\n\n');
  const { metadata: aiGrounded, droppedFields } = groundAiFields(
    aiRaw,
    evidenceText,
    input.scrapeWithFields.title || ''
  );

  const preferScrape = input.scrapeResult.diagnostics.confidence === 'high';
  const merged = mergeExtractedMetadata(
    { ...input.scrapeWithFields, category: null },
    aiGrounded,
    preferScrape,
    {
      url: input.resolvedUrl,
      scrapeApparelSizeKey: input.scrapeApparelKey,
      evidenceText: input.pageContext,
    }
  );

  const finalData: ExtractedMetadata = {
    ...merged,
    category: input.resolvedCategory || merged.category || input.scrapeWithFields.category,
    categoryAlternatives: input.resolvedAlternatives,
    desiredQuantity: resolveDesiredQuantity(
      merged.desiredQuantity,
      merged.title,
      input.scrapeWithFields.title
    ),
  };

  return { kind: 'success', finalData, droppedFields };
}
