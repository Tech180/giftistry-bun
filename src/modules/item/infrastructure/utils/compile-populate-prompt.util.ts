import { getDefaultAiPrompt } from '@/modules/system';
import type { MetadataPopulatorInput } from '../../domain/interfaces/metadata-populator-input.interface';
import {
  POPULATE_DESCRIPTION_FIELD_GUIDANCE,
  POPULATE_JSON_ONLY_FOOTER,
  RECONCILE_RULES,
} from '../constants/populate-prompt-rules.constant';
import type { LinkedPopulatePrompts } from '../interfaces/linked-populate-prompts.interface';
import { assemblePopulateHubPrompt } from './populate-hub-prompt.util';

export function applyPopulateTemplateTokens(
  template: string,
  input: MetadataPopulatorInput,
  searchContext: string
): string {
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{searchContext}/g, searchContext)
    .replace(/{itemName}/g, input.itemName || '')
    .replace(/{category}/g, input.category || '')
    .replace(/{existingNotes}/g, '')
    .replace(/{itemContext}/g, input.pageContext || 'None provided')
    .replace(/{existingCategories}/g, '')
    .replace(/{price}/g, '');
}

export function appendLinkedPromptSections(
  prompt: string,
  linked: LinkedPopulatePrompts | undefined,
  input: MetadataPopulatorInput,
  searchContext: string
): string {
  // Never append AiDescriptionPrompt (wishlist notes) — it steers models to put
  // prose in Note/Features instead of JSON Description.
  const descriptionPrompt = POPULATE_DESCRIPTION_FIELD_GUIDANCE;
  const categoryPrompt = applyPopulateTemplateTokens(
    linked?.categoryPrompt?.trim() || getDefaultAiPrompt('category'),
    input,
    searchContext
  );

  return `${assemblePopulateHubPrompt(prompt, descriptionPrompt, categoryPrompt)}\n\n${POPULATE_JSON_ONLY_FOOTER}`;
}

export function compilePopulatePrompt(
  customPrompt: string,
  input: MetadataPopulatorInput,
  linked?: LinkedPopulatePrompts
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('populate');
  const searchContext = input.searchContext?.trim() || 'None';
  const resolved = applyPopulateTemplateTokens(template, input, searchContext);

  const withReconcile =
    input.reconcileSources && searchContext !== 'None'
      ? `${RECONCILE_RULES}\n\n${resolved}`
      : resolved;

  return appendLinkedPromptSections(withReconcile, linked, input, searchContext);
}
