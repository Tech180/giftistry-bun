import type { ExtractedMetadata } from '../extracted-metadata';

export interface MetadataPopulatorInput {
  url: string;
  websiteName?: string;
  pageContext?: string;
  searchContext?: string;
  itemName?: string;
  category?: string;
  reconcileSources?: boolean;
}

export type MetadataPopulatorDeltaHandler = (delta: {
  tokensPerSecond: number | null;
}) => void | Promise<void>;

export interface MetadataPopulatorConfig {
  provider: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
  linkedDescriptionPrompt?: string;
  linkedCategoryPrompt?: string;
  onDelta?: MetadataPopulatorDeltaHandler;
}

export interface MetadataPopulator {
  populate(
    input: MetadataPopulatorInput,
    config: MetadataPopulatorConfig
  ): Promise<ExtractedMetadata>;
}
