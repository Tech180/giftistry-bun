import type {
  DescriptionSummarizer,
  DescriptionSummarizerConfig,
  DescriptionSummarizerInput,
} from '../domain/ports/description-summarizer.port';
import { completeTextPrompt } from './ai-text-completion';
import { getDefaultAiPrompt } from '@/modules/system/domain/ai-default-prompts';

export function compileDescriptionPrompt(
  customPrompt: string,
  input: DescriptionSummarizerInput
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('description');
  const priceText =
    input.price !== undefined && input.price !== null ? `$${input.price}` : 'Unknown';

  return template
    .replace(/{itemName}/g, input.itemName || '')
    .replace(/{category}/g, input.category || 'Uncategorized')
    .replace(/{url}/g, input.url || '')
    .replace(/{price}/g, priceText)
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{existingNotes}/g, input.existingNotes || '')
    .replace(/{itemContext}/g, input.itemContext || 'None provided');
}

export { formatItemContextBlock } from '../domain/format-item-context-block.util';

export class GeminiDescriptionSummarizer implements DescriptionSummarizer {
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
