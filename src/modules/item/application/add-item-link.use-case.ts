import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemLink } from '../domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { env } from '@/common/consts/env.consts';

export class AddItemLinkUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(itemId: string, url: string): Promise<ItemLink> {
    if (!itemId) {
      throw new AppError('Item ID is required', 400, 'BAD_REQUEST');
    }
    if (!url) {
      throw new AppError('URL is required', 400, 'BAD_REQUEST');
    }

    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw new AppError('Item not found', 404, 'NOT_FOUND');
    }

    // Fast hostname parsing for retailer name (microseconds)
    let retailerName: string | null = null;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const retailerNameRaw = hostname.replace('www.', '').split('.')[0] || '';
      retailerName = retailerNameRaw ? retailerNameRaw.charAt(0).toUpperCase() + retailerNameRaw.slice(1) : null;
    } catch (e) {
      // Invalid URL will throw AppError
      throw new AppError('Invalid URL format', 400, 'BAD_REQUEST');
    }

    // Save raw link details immediately (synchronously relative to network I/O)
    const link = await this.itemRepo.createLink(
      itemId,
      url,
      retailerName,
      null,
      null
    );

    // Fire and forget background scraper
    this.triggerBackgroundScraping(link.Id, url).catch(err => {
      console.error('Background scraper trigger failed:', err);
    });

    return link;
  }

  private async triggerBackgroundScraping(linkId: string, url: string): Promise<void> {
    const n8nWebhook = env.N8N;
    if (n8nWebhook) {
      fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ LinkId: linkId, Url: url })
      }).catch(err => {
        console.error('Failed to trigger n8n scraping webhook:', err);
      });
      return;
    }

    // Fallback: local non-blocking scraper inside Bun
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!res.ok) return;

      const html = await res.text();
      
      // Extract OG Image
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      const extractedImageUrl = ogImageMatch ? ogImageMatch[1] ?? null : null;

      // Extract Price
      const priceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i);
      const priceVal = priceMatch ? Number(priceMatch[1]) : null;
      const extractedPrice = priceVal && !isNaN(priceVal) ? priceVal : null;

      if (extractedPrice !== null || extractedImageUrl !== null) {
        await this.itemRepo.updateLinkMetadata(linkId, extractedPrice, extractedImageUrl);
      }
    } catch (error) {
      console.error('Background native scraping failed:', error);
    }
  }
}
