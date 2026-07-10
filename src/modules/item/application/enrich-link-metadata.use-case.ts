import type { MetadataScraper } from '../domain/ports/metadata-scraper.port';
import type { ItemRepository } from '../domain/ports/item.repository';

export class EnrichLinkMetadataUseCase {
  constructor(
    private metadataScraper: MetadataScraper,
    private itemRepo: ItemRepository
  ) {}

  async execute(linkId: string, url: string, userPrice: number | null): Promise<void> {
    const { data } = await this.metadataScraper.scrape(url, 'minimal');
    const finalPrice = userPrice !== null ? userPrice : data.price;

    if (finalPrice !== null || data.imageUrl !== null) {
      await this.itemRepo.updateLinkMetadata(linkId, finalPrice, data.imageUrl);
    }
  }
}
