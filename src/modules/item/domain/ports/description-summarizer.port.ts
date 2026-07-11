export interface DescriptionSummarizerInput {
  itemName: string;
  category?: string;
  url?: string;
  price?: number | null;
  websiteName?: string;
  existingNotes?: string;
  itemContext: string;
}

export interface DescriptionSummarizerConfig {
  provider: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  endpoint: string;
}

export interface DescriptionSummarizer {
  summarize(
    input: DescriptionSummarizerInput,
    config: DescriptionSummarizerConfig
  ): Promise<string>;
}
