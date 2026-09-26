/**
 * Collapses PDF notes into compact flowing text so multi-paragraph AI summaries
 * do not leave large vertical gaps in wishlist exports.
 */
export function normalizePdfNotesText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}
