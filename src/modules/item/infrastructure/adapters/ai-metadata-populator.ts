import type { ExtractedMetadata } from '../../domain/interfaces/extracted-metadata.interface';
import type { MetadataPopulator } from '../../domain/ports/metadata-populator.port';
import type { MetadataPopulatorConfig } from '../../domain/interfaces/metadata-populator-config.interface';
import type { MetadataPopulatorInput } from '../../domain/interfaces/metadata-populator-input.interface';
import { compilePopulatePrompt } from '../utils/compile-populate-prompt.util';
import { parsePopulateJson } from '../utils/parse-populate-json.util';
import { completeTextPromptStream } from '../utils/ai-text-completion.util';
import { fetchPageContext } from '../utils/http-page-context.util';

export class AiMetadataPopulator implements MetadataPopulator {
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
