import type { CategoryClassifierInput } from '../../domain/interfaces/category-classifier-input.interface';

export function compileCategoryPrompt(
  template: string,
  input: CategoryClassifierInput
): string {
  const existing =
    input.existingCategories?.filter((c) => c?.trim() && c !== 'uncategorized').join(', ') ||
    '';
  return template
    .replace(/{url}/g, input.url || '')
    .replace(/{websiteName}/g, input.websiteName || '')
    .replace(/{pageContext}/g, input.pageContext || 'None provided')
    .replace(/{itemName}/g, input.itemName || '')
    .replace(/{existingCategories}/g, existing);
}
