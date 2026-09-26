export function placeholderNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const label = hostname.replace(/^www\./, '').split('.')[0] || '';
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : 'Item';
  } catch {
    return 'Item';
  }
}
