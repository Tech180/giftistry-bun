import type { MetadataScraper } from '../domain/ports/metadata-scraper.port';
import type { ItemRepository } from '../domain/ports/item.repository';
import type { PromoteScrapedImageToPhotosUseCase } from './promote-scraped-image-to-photos.use-case';

export class EnrichLinkMetadataUseCase {
  constructor(
    private metadataScraper: MetadataScraper,
    private itemRepo: ItemRepository,
    private promoteScrapedImageToPhotos?: PromoteScrapedImageToPhotosUseCase
  ) {}

  async execute(linkId: string, url: string, userPrice: number | null): Promise<void> {
    try {
      const { data, diagnostics, finalUrl, websiteName } = await this.metadataScraper.scrape(
        url,
        'minimal'
      );
      const finalPrice = userPrice !== null ? userPrice : data.price;
      const resolvedUrl = finalUrl?.trim() || url;

      const hasUsableData =
        diagnostics.confidence !== 'low' && (finalPrice !== null || data.imageUrl !== null);

      if (hasUsableData) {
        const itemId = await this.itemRepo.findItemIdByLinkId(linkId);
        const existing =
          itemId != null
            ? (await this.itemRepo.findLinksByItemId(itemId)).find((link) => link.Id === linkId)
            : undefined;

        await this.itemRepo.updateLink(
          linkId,
          resolvedUrl,
          websiteName?.trim() || existing?.RetailerName || null,
          finalPrice,
          data.imageUrl
        );

        if (data.imageUrl && this.promoteScrapedImageToPhotos && itemId) {
          await this.promoteScrapedImageToPhotos.execute(itemId, data.imageUrl);
        }
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
