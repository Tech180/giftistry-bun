import type { DescriptionSummarizerInput } from '../interfaces/description-summarizer-input.interface';
import type { DescriptionSummarizerConfig } from '../interfaces/description-summarizer-config.interface';

export interface DescriptionSummarizer {
  summarize(
    input: DescriptionSummarizerInput,
    config: DescriptionSummarizerConfig
  ): Promise<string>;
}
