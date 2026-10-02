import { getDefaultAiPrompt } from '@/modules/system';
import type { MetadataPopulatorInput } from '../../domain/interfaces/metadata-populator-input.interface';
import {
  POPULATE_DESCRIPTION_FIELD_GUIDANCE,
  POPULATE_JSON_ONLY_FOOTER,
  RECONCILE_RULES,
  wrapUntrustedPageContext,
  wrapUntrustedSearchContext,
} from '../constants/populate-prompt-rules.constant';
import type { CompilePopulatePromptOptions } from '../interfaces/compile-populate-prompt-options.interface';
import type { LinkedPopulatePrompts } from '../interfaces/linked-populate-prompts.interface';
import { assemblePopulateHubPrompt } from './populate-hub-prompt.util';

const COMPACT_DESCRIPTION_GUIDANCE = `
"Description" must be 1–2 plain sentences about what the product is. Put specs only in PredefinedFields / UserDefinedFields.
`.trim();

export function applyPopulateTemplateTokens(
  template: string,
  input: MetadataPopulatorInput,
  searchContext: string
): string {
  const wrappedPage = wrapUntrustedPageContext(input.pageContext || '');
  const wrappedSearch = wrapUntrustedSearchContext(searchContext);
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, wrappedPage)
    .replace(/{searchContext}/g, wrappedSearch)
    .replace(/{itemName}/g, input.itemName || '')
    .replace(/{category}/g, input.category || '')
    .replace(/{existingNotes}/g, '')
    .replace(/{itemContext}/g, wrappedPage)
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

function appendCompactFooter(prompt: string): string {
  return `${prompt}\n\n${COMPACT_DESCRIPTION_GUIDANCE}\n\n${POPULATE_JSON_ONLY_FOOTER}`;
}

export function compilePopulatePrompt(
  customPrompt: string,
  input: MetadataPopulatorInput,
  linked?: LinkedPopulatePrompts,
  options: CompilePopulatePromptOptions = {}
): string {
  const profile = options.profile ?? 'full';
  const includeCategoryHub = options.includeCategoryHub ?? profile === 'full';
  const defaultKind = profile === 'compact' ? 'populateCompact' : 'populate';
  // Admin custom populate prompt still applies when set; otherwise use profile default.
  const resolvedTemplate = customPrompt.trim() || getDefaultAiPrompt(defaultKind);
  const searchContext = input.searchContext?.trim() || 'None';
  const resolved = applyPopulateTemplateTokens(resolvedTemplate, input, searchContext);

  const withReconcile =
    input.reconcileSources && searchContext !== 'None' && searchContext.length > 0
      ? `${RECONCILE_RULES}\n\n${resolved}`
      : resolved;

  if (!includeCategoryHub) {
    return appendCompactFooter(withReconcile);
  }

  return appendLinkedPromptSections(withReconcile, linked, input, searchContext);
}
