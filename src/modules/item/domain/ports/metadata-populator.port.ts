import type { ExtractedMetadata } from '../extracted-metadata';

export interface MetadataPopulatorInput {
  url: string;
  websiteName?: string;
  pageContext?: string;
  itemName?: string;
}

export interface MetadataPopulatorConfig {
  provider: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
}

export interface MetadataPopulator {
  populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata>;
}
