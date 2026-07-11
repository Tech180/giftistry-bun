import { scrapingConfig, CHROME_USER_AGENT } from './scraping-config';

export function buildFetchHeaders(url: string): Record<string, string> {
  let referer = '';
  try {
    const origin = new URL(url).origin;
    referer = `${origin}/`;
  } catch {
    referer = '';
  }

  return {
    'User-Agent': scrapingConfig.userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    ...(referer ? { Referer: referer } : {}),
  };
}

export { CHROME_USER_AGENT };
