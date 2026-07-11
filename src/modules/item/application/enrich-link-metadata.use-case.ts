import type { MetadataScraper } from '../domain/ports/metadata-scraper.port';
import type { ItemRepository } from '../domain/ports/item.repository';

export class EnrichLinkMetadataUseCase {
  constructor(
    private metadataScraper: MetadataScraper,
    private itemRepo: ItemRepository
  ) {}

  async execute(linkId: string, url: string, userPrice: number | null): Promise<void> {
    try {
      const { data, diagnostics } = await this.metadataScraper.scrape(url, 'minimal');
      const finalPrice = userPrice !== null ? userPrice : data.price;

      const hasUsableData =
        diagnostics.confidence !== 'low' && (finalPrice !== null || data.imageUrl !== null);

      if (hasUsableData) {
        await this.itemRepo.updateLinkMetadata(linkId, finalPrice, data.imageUrl);
      } else {
        console.log(
          `[Scraper] enrich skipped linkId=${linkId} url=${url} reason=${diagnostics.validationReason ?? 'low-confidence'}`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[Scraper] enrich failed linkId=${linkId} url=${url} error=${message}`);
    }
  }
}
