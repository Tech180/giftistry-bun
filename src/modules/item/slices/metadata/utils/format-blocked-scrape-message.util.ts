/** User-facing copy when Amazon (or similar) blocks automated enrich. */
export function formatBlockedScrapeMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Failed to fetch product details automatically.';
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('bot-check') ||
    lower.includes('short-link-shell') ||
    lower.includes('captcha') ||
    lower.includes('robot check')
  ) {
    return 'Amazon blocked access to scrape; Please enter details manually.';
  }

  return trimmed;
}
