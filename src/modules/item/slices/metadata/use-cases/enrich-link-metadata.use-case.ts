import type { MetadataScraper } from '../../../domain/ports/metadata-scraper.port';
import type { ItemRepository } from '../../../domain/ports/item.repository';
import { ScrapeError } from '../../../infrastructure/scraping/errors/scrape-error';
import { formatBlockedScrapeMessage } from '../utils/format-blocked-scrape-message.util';
import type { ExtractMetadataUseCase } from './extract-metadata.use-case';
import type { PromoteScrapedImageToPhotosUseCase } from './promote-scraped-image-to-photos.use-case';

export class EnrichLinkMetadataUseCase {
  constructor(
    private metadataScraper: MetadataScraper,
    private itemRepo: ItemRepository,
    private promoteScrapedImageToPhotos?: PromoteScrapedImageToPhotosUseCase,
    private extractMetadata?: ExtractMetadataUseCase
  ) {}

  async execute(
    linkId: string,
    url: string,
    userPrice: number | null,
    userId?: string
  ): Promise<void> {
    try {
      const { data, diagnostics, finalUrl, websiteName } = await this.metadataScraper.scrape(
        url,
        'minimal'
      );
      await this.applyScrape(linkId, url, userPrice, {
        title: data.title,
        price: data.price,
        imageUrl: data.imageUrl,
        confidence: diagnostics.confidence,
        validationReason: diagnostics.validationReason,
        finalUrl,
        websiteName,
      });
    } catch (err) {
      if (
        err instanceof ScrapeError &&
        err.diagnostics?.blocked &&
        this.extractMetadata &&
        userId
      ) {
        try {
          const extract = await this.extractMetadata.execute(url, userId);
          await this.applyScrape(linkId, url, userPrice, {
            title: extract.data.title,
            price: extract.data.price,
            imageUrl: extract.data.imageUrl,
            confidence: extract.diagnostics.confidence,
            validationReason: extract.diagnostics.validationReason,
            finalUrl: extract.finalUrl,
            websiteName: extract.websiteName,
          });
          return;
        } catch (fallbackErr) {
          const message =
            fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          console.log(
            `[Scraper] enrich blocked fallback failed linkId=${linkId} url=${url} error=${formatBlockedScrapeMessage(message)}`
          );
          return;
        }
      }

      const message = err instanceof Error ? err.message : String(err);
      console.log(
        `[Scraper] enrich failed linkId=${linkId} url=${url} error=${formatBlockedScrapeMessage(message)}`
      );
    }
  }

  private async applyScrape(
    linkId: string,
    url: string,
    userPrice: number | null,
    scrape: {
      title: string;
      price: number | null;
      imageUrl: string | null;
      confidence: string;
      validationReason?: string;
      finalUrl?: string;
      websiteName?: string;
    }
  ): Promise<void> {
    const finalPrice = userPrice !== null ? userPrice : scrape.price;
    const resolvedUrl = scrape.finalUrl?.trim() || url;

    const hasUsableData =
      scrape.confidence !== 'low' && (finalPrice !== null || scrape.imageUrl !== null);

    if (!hasUsableData) {
      console.log(
        `[Scraper] enrich skipped linkId=${linkId} url=${url} reason=${scrape.validationReason ?? 'low-confidence'}`
      );
      return;
    }

    const itemId = await this.itemRepo.findItemIdByLinkId(linkId);
    const existing =
      itemId != null
        ? (await this.itemRepo.findLinksByItemId(itemId)).find((link) => link.Id === linkId)
        : undefined;

    // Scraped images go into Item.Photos only — never persist on the link.
    await this.itemRepo.updateLink(
      linkId,
      resolvedUrl,
      scrape.websiteName?.trim() || existing?.RetailerName || null,
      finalPrice,
      null
    );

    if (scrape.imageUrl && this.promoteScrapedImageToPhotos && itemId) {
      await this.promoteScrapedImageToPhotos.execute(itemId, scrape.imageUrl);
    }
  }
}
