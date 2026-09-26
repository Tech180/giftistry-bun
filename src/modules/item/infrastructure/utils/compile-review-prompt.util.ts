import { getDefaultAiPrompt } from '@/modules/system';

export function compileReviewPrompt(
  customPrompt: string,
  itemName: string,
  category: string,
  url: string,
  pageContext: string
): string {
  const template = customPrompt.trim() || getDefaultAiPrompt('review');
  const pageContextBlock = pageContext.trim()
    ? `Scraped Page Metadata:\n${pageContext.trim()}`
    : '';

  return template
    .replace(/{itemName}/g, itemName)
    .replace(/{category}/g, category)
    .replace(/{url}/g, url)
    .replace(/{pageContext}/g, pageContextBlock);
}
