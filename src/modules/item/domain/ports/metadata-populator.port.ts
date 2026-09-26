import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import type { MetadataPopulatorInput } from '../interfaces/metadata-populator-input.interface';
import type { MetadataPopulatorConfig } from '../interfaces/metadata-populator-config.interface';

export interface MetadataPopulator {
  populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata>;
}
