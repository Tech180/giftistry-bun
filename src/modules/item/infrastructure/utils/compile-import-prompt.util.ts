import { getDefaultAiPrompt } from '@/modules/system';
import type { ItemImportParserInput } from '../../domain/interfaces/item-import-parser-input.interface';
import { IMPORT_CATEGORY_PRESERVATION_RULES } from '../constants/import-category-preservation.constant';

export function compileImportPrompt(
  customPrompt: string,
  input: ItemImportParserInput
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('import');
  let compiled = template
    .replace(/{fileName}/g, input.fileName || '')
    .replace(/{format}/g, input.format || 'unknown')
    .replace(/{wishlistTitle}/g, input.wishlistTitle || '')
    .replace(/{existingCategories}/g, input.existingCategories || '')
    .replace(/{fileContent}/g, input.fileContent || '');

  if (input.optimizeCategories === false) {
    compiled += `\n\n${IMPORT_CATEGORY_PRESERVATION_RULES}\n`;
  }

  return compiled;
}
