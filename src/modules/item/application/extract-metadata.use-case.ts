import type { MetadataScraper } from '../domain/ports/metadata-scraper.port';
import type { ExtractedMetadata } from '../domain/extracted-metadata';

export class ExtractMetadataUseCase {
  constructor(private metadataScraper: MetadataScraper) {}

  async execute(url: string): Promise<ExtractedMetadata> {
    const { data } = await this.metadataScraper.scrape(url, 'full');
    return data;
  }
}
