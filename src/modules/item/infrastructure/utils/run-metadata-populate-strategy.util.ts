import {
  buildMetadataPackSection,
  type AiMetadataExtractionOptions,
  type MetadataPack,
} from '@/modules/system';
import type { ExtractedMetadata } from '../../domain/interfaces/extracted-metadata.interface';
import type { MetadataPopulatorConfig } from '../../domain/interfaces/metadata-populator-config.interface';
import type { MetadataPopulatorInput } from '../../domain/interfaces/metadata-populator-input.interface';
import { compilePopulatePrompt } from './compile-populate-prompt.util';
import { PopulateJsonValidationError } from '../errors/populate-json-validation.error';
import { parsePopulateJson } from './parse-populate-json.util';
import {
  buildPopulateRepairPrompt,
  buildPopulateTruncationRetryPrompt,
  describePopulateFailure,
  isTruncatedPopulateReply,
  resolveTruncationRetryMaxTokens,
} from './populate-retry.util';
import { completeTextPromptStream } from './ai-text-completion.util';
import { wrapUntrustedPageContext } from '../constants/populate-prompt-rules.constant';

function emptyMetadata(): ExtractedMetadata {
  return {
    title: '',
    price: null,
    description: null,
    color: null,
    size: null,
    category: null,
    imageUrl: null,
    predefinedFields: {},
    userDefinedFields: {},
  };
}

function mergePopulateResults(
  base: ExtractedMetadata,
  overlay: ExtractedMetadata
): ExtractedMetadata {
  return {
    title: overlay.title?.trim() || base.title,
    price: overlay.price ?? base.price,
    description: overlay.description?.trim() ? overlay.description : base.description,
    color: overlay.color?.trim() ? overlay.color : base.color,
    size: overlay.size?.trim() ? overlay.size : base.size,
    category: overlay.category?.trim() ? overlay.category : base.category,
    imageUrl: overlay.imageUrl?.trim() ? overlay.imageUrl : base.imageUrl,
    desiredQuantity: overlay.desiredQuantity ?? base.desiredQuantity,
    predefinedFields: {
      ...(base.predefinedFields ?? {}),
      ...(overlay.predefinedFields ?? {}),
    },
    userDefinedFields: {
      ...(base.userDefinedFields ?? {}),
      ...(overlay.userDefinedFields ?? {}),
    },
  };
}

async function completePopulate(
  prompt: string,
  config: MetadataPopulatorConfig,
  maxTokens: number | null | undefined,
  options: { compactPrompt?: () => string } = {}
): Promise<ExtractedMetadata> {
  const request = async (userPrompt: string, tokens: number | null | undefined) =>
    completeTextPromptStream(
      userPrompt,
      {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
        endpoint: config.endpoint,
        jsonResponse: true,
        temperature: 0,
        ...(config.timeoutMs != null ? { timeoutMs: config.timeoutMs } : {}),
        ...(tokens != null ? { maxTokens: tokens } : {}),
      },
      async (delta) => {
        await config.onDelta?.({ tokensPerSecond: delta.tokensPerSecond });
      }
    );

  const first = await request(prompt, maxTokens);
  try {
    return parsePopulateJson(first.text);
  } catch (err) {
    if (!(err instanceof PopulateJsonValidationError)) {
      throw err;
    }

    const truncated = isTruncatedPopulateReply(err, first.finishReason);
    const retryMaxTokens = truncated ? resolveTruncationRetryMaxTokens(maxTokens) : maxTokens;
    const retryPrompt = truncated
      ? buildPopulateTruncationRetryPrompt(options.compactPrompt?.() ?? prompt)
      : buildPopulateRepairPrompt(prompt, err, first.text);

    const second = await request(retryPrompt, retryMaxTokens);
    try {
      return parsePopulateJson(second.text);
    } catch (retryErr) {
      if (retryErr instanceof PopulateJsonValidationError) {
        console.warn(
          '[AI Populate] Populate JSON failed after retry',
          describePopulateFailure({
            err: retryErr,
            text: second.text,
            finishReason: second.finishReason,
            maxTokens: retryMaxTokens,
            model: config.model,
          })
        );
      }
      throw retryErr;
    }
  }
}

function buildPackOnlyPrompt(
  packs: readonly MetadataPack[],
  input: MetadataPopulatorInput,
  core: ExtractedMetadata
): string {
  const packSection = buildMetadataPackSection(packs);
  return `You extract metadata-pack custom fields for a product. Return ONE JSON object with only PredefinedFields and UserDefinedFields (omit unknown keys).

Product URL: ${input.url || ''}
Store: ${input.websiteName || ''}
Item name: ${input.itemName || ''}
Category: ${input.category || ''}

Core fields already extracted (do not repeat unless correcting):
${JSON.stringify({
  Title: core.title || null,
  Price: core.price,
  Description: core.description,
  Color: core.color,
  Size: core.size,
})}

Page context:
${wrapUntrustedPageContext(input.pageContext || '')}

${packSection}

Output raw JSON only:
{ "PredefinedFields": {}, "UserDefinedFields": {} }`;
}

async function runSplitPopulate(
  input: MetadataPopulatorInput,
  config: MetadataPopulatorConfig,
  extraction: AiMetadataExtractionOptions,
  packs: readonly MetadataPack[]
): Promise<ExtractedMetadata> {
  const corePrompt = compilePopulatePrompt(
    config.customPrompt,
    input,
    {
      descriptionPrompt: config.linkedDescriptionPrompt,
      categoryPrompt: config.linkedCategoryPrompt,
    },
    {
      profile: 'compact',
      includeCategoryHub: false,
    }
  );

  const core = await completePopulate(corePrompt, config, extraction.populateMaxTokens);

  if (packs.length === 0) {
    return core;
  }

  let merged = core;

  if (extraction.splitPackCalls) {
    for (const pack of packs) {
      try {
        const packResult = await completePopulate(
          buildPackOnlyPrompt([pack], input, core),
          config,
          extraction.populateMaxTokens
        );
        merged = mergePopulateResults(merged, packResult);
      } catch (err) {
        console.warn(
          `[AI Populate] Pack call failed for ${pack.id}; continuing with partial fields`,
          err
        );
      }
    }
    return merged;
  }

  try {
    const packResult = await completePopulate(
      buildPackOnlyPrompt(packs, input, core),
      config,
      extraction.populateMaxTokens
    );
    return mergePopulateResults(merged, packResult);
  } catch (err) {
    console.warn('[AI Populate] Combined pack call failed; returning core fields only', err);
    return merged;
  }
}

export async function runMetadataPopulateStrategy(
  input: MetadataPopulatorInput,
  config: MetadataPopulatorConfig
): Promise<ExtractedMetadata> {
  const extraction = config.extractionOptions;
  const packs = config.packs ?? [];

  if (extraction?.splitCalls) {
    return runSplitPopulate(input, config, extraction, packs);
  }

  const profile = extraction?.promptProfile ?? 'full';
  const includeCategoryHub = extraction?.includeCategoryHub ?? profile === 'full';
  const prompt = compilePopulatePrompt(
    config.customPrompt,
    input,
    {
      descriptionPrompt: config.linkedDescriptionPrompt,
      categoryPrompt: config.linkedCategoryPrompt,
    },
    {
      profile,
      includeCategoryHub,
    }
  );

  return completePopulate(prompt, config, extraction?.populateMaxTokens, {
    compactPrompt:
      profile === 'compact'
        ? undefined
        : () =>
            compilePopulatePrompt(
              config.customPrompt,
              input,
              {
                descriptionPrompt: config.linkedDescriptionPrompt,
                categoryPrompt: config.linkedCategoryPrompt,
              },
              { profile: 'compact', includeCategoryHub: false }
            ),
  });
}

/** Test helper for merge semantics. */
export function mergePopulateResultsForTests(
  base: ExtractedMetadata,
  overlay: ExtractedMetadata
): ExtractedMetadata {
  return mergePopulateResults(base ?? emptyMetadata(), overlay);
}
