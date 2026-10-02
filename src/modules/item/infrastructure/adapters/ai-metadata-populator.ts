import type { ExtractedMetadata } from '../../domain/interfaces/extracted-metadata.interface';
import type { MetadataPopulator } from '../../domain/ports/metadata-populator.port';
import type { MetadataPopulatorConfig } from '../../domain/interfaces/metadata-populator-config.interface';
import type { MetadataPopulatorInput } from '../../domain/interfaces/metadata-populator-input.interface';
import { fetchPageContext } from '../utils/http-page-context.util';
import { runMetadataPopulateStrategy } from '../utils/run-metadata-populate-strategy.util';

export class AiMetadataPopulator implements MetadataPopulator {
  async populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata> {
    const pageContext = input.pageContext ?? (await fetchPageContext(input.url));
    return runMetadataPopulateStrategy(
      {
        ...input,
        pageContext,
      },
      config
    );
  }
}
