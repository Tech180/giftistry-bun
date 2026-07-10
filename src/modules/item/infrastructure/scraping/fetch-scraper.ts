export class ScrapeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeFetchError';
  }
}

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function fetchPageHtml(url: string, timeoutMs = 5000): Promise<string> {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new ScrapeFetchError(`HTTP ${res.status}`);
  }

  return res.text();
}
