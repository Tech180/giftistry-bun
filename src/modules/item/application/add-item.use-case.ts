import type { ItemRepository } from '../domain/ports/item.repository';
import type { Item } from '../domain/item.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { env } from '@/common/consts/env.consts';

export class AddItemUseCase {
  constructor(private itemRepo: ItemRepository) {}

  async execute(
    listId: string,
    name: string,
    description: string | null = null,
    priorityId: string | null = null,
    isHiddenIdea: boolean = false,
    suggestedByUserId: string | null = null,
    linkUrl: string | null = null,
    price: number | null = null,
    websiteName: string | null = null,
    category: string = 'uncategorized',
    isSuggestion: boolean = false
  ): Promise<Item> {
    if (!listId) {
      throw new AppError('List ID is required', 400, 'BAD_REQUEST');
    }
    if (!name) {
      throw new AppError('Item name is required', 400, 'BAD_REQUEST');
    }

    let retailerName: string | null = websiteName || null;
    if (linkUrl && !retailerName) {
      try {
        const urlObj = new URL(linkUrl);
        const hostname = urlObj.hostname;
        const retailerNameRaw = hostname.replace('www.', '').split('.')[0] || '';
        retailerName = retailerNameRaw ? retailerNameRaw.charAt(0).toUpperCase() + retailerNameRaw.slice(1) : null;
      } catch (e) {
        throw new AppError('Invalid URL format', 400, 'BAD_REQUEST');
      }
    }

    const item = await this.itemRepo.create(listId, priorityId, suggestedByUserId, name, description, isHiddenIdea, category, isSuggestion);

    if (linkUrl) {
      const link = await this.itemRepo.createLink(
        item.Id,
        linkUrl,
        retailerName,
        price,
        null
      );

      // Fire and forget background scraper
      this.triggerBackgroundScraping(link.Id, linkUrl, price).catch(err => {
        console.error('Background scraper trigger failed:', err);
      });
    }

    return item;
  }

  private async triggerBackgroundScraping(linkId: string, url: string, userPrice: number | null): Promise<void> {
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
      let extractedPrice: number | null = null;
      if (userPrice === null) {
        const priceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i);
        const priceVal = priceMatch ? Number(priceMatch[1]) : null;
        extractedPrice = priceVal && !isNaN(priceVal) ? priceVal : null;
      }

      const finalPrice = userPrice !== null ? userPrice : extractedPrice;

      if (finalPrice !== null || extractedImageUrl !== null) {
        await this.itemRepo.updateLinkMetadata(linkId, finalPrice, extractedImageUrl);
      }
    } catch (error) {
      console.error('Background native scraping failed:', error);
    }
  }
}
