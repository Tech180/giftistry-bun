import * as cheerio from 'cheerio';
import type { RetailerExtractor } from './retailer-registry';

function parsePrice(text: string): number | null {
  const parsed = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export const shopifyExtractor: RetailerExtractor = {
  hostnames: ['myshopify.com'],
  priority: 55,
  extract({ html, mode }) {
    const $ = cheerio.load(html);

    const shopifyMatch = html.match(/ShopifyAnalytics\.meta\.product\s*=\s*(\{[\s\S]*?\});/);
    let title: string | null = null;
    let price: number | null = null;

    if (shopifyMatch?.[1]) {
      try {
        const product = JSON.parse(shopifyMatch[1]) as Record<string, unknown>;
        if (typeof product.name === 'string') title = product.name;
        if (typeof product.price === 'number') price = product.price / 100;
      } catch {
        // ignore
      }
    }

    const metaTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const metaPrice = $('meta[property="product:price:amount"]').attr('content')?.trim();
    const imageUrl = $('meta[property="og:image"]').attr('content')?.trim() || null;

    return {
      title: title || metaTitle || null,
      price: price ?? (metaPrice ? parsePrice(metaPrice) : null),
      description: $('meta[property="og:description"]').attr('content')?.trim() || null,
      imageUrl,
      color: mode === 'full' ? $('meta[property="product:color"]').attr('content')?.trim() || null : undefined,
    };
  },
};
