import type { ExtractedMetadata } from '../extracted-metadata';

export interface MetadataPopulatorInput {
  url: string;
  websiteName?: string;
  pageContext?: string;
  searchContext?: string;
  itemName?: string;
  reconcileSources?: boolean;
}

export interface MetadataPopulatorConfig {
  provider: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
  linkedDescriptionPrompt?: string;
  linkedCategoryPrompt?: string;
}

export interface MetadataPopulator {
  populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata>;
}
