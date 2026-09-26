export function getSiteName(urlStr: string): string {
  try {
    const urlObj = new URL(urlStr);
    const hostname = urlObj.hostname;
    const clean = hostname.replace('www.', '').split('.')[0] || '';
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Store';
  } catch {
    return 'Store';
  }
}
