import type { DescriptionSummarizer } from '../../domain/ports/description-summarizer.port';
import type { DescriptionSummarizerConfig } from '../../domain/interfaces/description-summarizer-config.interface';
import type { DescriptionSummarizerInput } from '../../domain/interfaces/description-summarizer-input.interface';
import { compileDescriptionPrompt } from '../utils/compile-description-prompt.util';
import { completeTextPrompt } from '../utils/ai-text-completion.util';

export class AiDescriptionSummarizer implements DescriptionSummarizer {
  async summarize(
    input: DescriptionSummarizerInput,
    config: DescriptionSummarizerConfig
  ): Promise<string> {
    const prompt = compileDescriptionPrompt(config.customPrompt, input);
    const text = await completeTextPrompt(prompt, {
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      endpoint: config.endpoint,
    });

    return text.trim();
  }
}
