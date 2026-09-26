import { getDefaultAiPrompt } from '@/modules/system';
import type { DescriptionSummarizerInput } from '../../domain/interfaces/description-summarizer-input.interface';

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
