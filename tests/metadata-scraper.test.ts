import { describe, expect, test } from 'bun:test';
import { parseMetadata, extractTitleFromSlug } from '@/modules/item/infrastructure/scraping/parser';
import { validateScrapeResult } from '@/modules/item/infrastructure/scraping/validators';
import { ExtractMetadataUseCase } from '@/modules/item/application/extract-metadata.use-case';
import { EnrichLinkMetadataUseCase } from '@/modules/item/application/enrich-link-metadata.use-case';
import type { MetadataScraper } from '@/modules/item/domain/ports/metadata-scraper.port';
import type { ItemRepository } from '@/modules/item/domain/ports/item.repository';

const PRODUCT_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Store Page</title>
  <meta property="og:title" content="Wireless Bluetooth Headphones" />
  <meta property="og:description" content="Premium over-ear headphones with noise cancellation." />
  <meta property="product:price:amount" content="79.99" />
  <meta property="og:image" content="https://example.com/headphones.jpg" />
  <meta property="product:color" content="Black" />
  <meta property="product:size" content="One Size" />
  <script type="application/ld+json">
    {"@type":"Product","name":"Wireless Bluetooth Headphones","color":"Midnight Black","size":"Standard"}
  </script>
</head>
<body></body>
</html>`;

const CLOUDFLARE_HTML = `<!DOCTYPE html>
<html>
<head><title>Just a moment...</title></head>
<body>
  <div id="cf-browser-verification">Checking your browser before accessing the site.</div>
  <div class="challenge-platform">Please wait.</div>
</body>
</html>`.padEnd(600, ' ');

const GENERIC_AMAZON_HTML = `<!DOCTYPE html>
<html>
<head><title>Amazon.com</title></head>
<body><p>Shop Amazon</p></body>
</html>`.padEnd(600, ' ');

describe('metadata scraper parser', () => {
  test('extracts all fields in full mode', () => {
    const result = parseMetadata(
      PRODUCT_HTML,
      'https://tech.example.com/headphones/wireless-bluetooth-headphones',
      'full'
    );

    expect(result.title).toBe('Wireless Bluetooth Headphones');
    expect(result.price).toBe(79.99);
    expect(result.description).toBe('Premium over-ear headphones with noise cancellation.');
    expect(result.imageUrl).toBe('https://example.com/headphones.jpg');
    expect(result.color).toBe('Midnight Black');
    expect(result.size).toBe('Standard');
    expect(result.category).toBe('digital_tech');
  });

  test('skips color size and category in minimal mode', () => {
    const result = parseMetadata(PRODUCT_HTML, 'https://tech.example.com/headphones', 'minimal');

    expect(result.title).toBe('Wireless Bluetooth Headphones');
    expect(result.price).toBe(79.99);
    expect(result.imageUrl).toBe('https://example.com/headphones.jpg');
    expect(result.color).toBeNull();
    expect(result.size).toBeNull();
    expect(result.category).toBeNull();
  });

  test('falls back to URL slug for generic retailer titles', () => {
    const result = parseMetadata(
      GENERIC_AMAZON_HTML,
      'https://amazon.com/dp/wireless-bluetooth-headphones-pro',
      'full'
    );

    expect(result.title).toBe('Wireless Bluetooth Headphones Pro');
  });

  test('extractTitleFromSlug capitalizes hyphenated segments', () => {
    expect(extractTitleFromSlug('https://shop.com/products/cotton-crew-socks')).toBe(
      'Cotton Crew Socks'
    );
  });
});

describe('metadata scraper validators', () => {
  test('accepts valid full scrape results', () => {
    const data = parseMetadata(PRODUCT_HTML, 'https://tech.example.com/headphones', 'full');
    const validation = validateScrapeResult(data, PRODUCT_HTML, 'full');
    expect(validation.valid).toBe(true);
  });

  test('rejects cloudflare block pages', () => {
    const data = parseMetadata(CLOUDFLARE_HTML, 'https://blocked.example.com/item', 'full');
    const validation = validateScrapeResult(data, CLOUDFLARE_HTML, 'full');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('cloudflare');
  });

  test('rejects generic retailer shells without usable metadata', () => {
    const data = parseMetadata(GENERIC_AMAZON_HTML, 'https://amazon.com/', 'full');
    const validation = validateScrapeResult(data, GENERIC_AMAZON_HTML, 'full');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('generic-retailer-shell');
  });

  test('rejects minimal results without image or price', () => {
    const html = '<html><head><title>Empty Product</title></head><body></body></html>'.padEnd(
      600,
      ' '
    );
    const data = parseMetadata(html, 'https://example.com/item', 'minimal');
    const validation = validateScrapeResult(data, html, 'minimal');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('missing-critical-fields-minimal');
  });
});

describe('metadata scraper use cases', () => {
  test('ExtractMetadataUseCase delegates to MetadataScraper port', async () => {
    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        source: 'fetch',
        data: {
          title: 'Test Product',
          price: 25,
          description: 'A test item',
          color: 'Blue',
          size: 'M',
          category: 'apparel_accessories',
          imageUrl: null,
        },
      }),
    };

    const useCase = new ExtractMetadataUseCase(mockScraper);
    const result = await useCase.execute('https://example.com/product');

    expect(result.title).toBe('Test Product');
    expect(result.price).toBe(25);
  });

  test('EnrichLinkMetadataUseCase updates link metadata from scrape result', async () => {
    let updatedPrice: number | null = null;
    let updatedImage: string | null = null;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        source: 'fetch',
        data: {
          title: 'Ignored',
          price: 42,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: 'https://example.com/image.jpg',
        },
      }),
    };

    const mockRepo: Pick<ItemRepository, 'updateLinkMetadata'> = {
      updateLinkMetadata: async (_linkId, price, imageUrl) => {
        updatedPrice = price;
        updatedImage = imageUrl;
      },
    };

    const useCase = new EnrichLinkMetadataUseCase(
      mockScraper,
      mockRepo as ItemRepository
    );

    await useCase.execute('link-1', 'https://example.com/product', null);

    expect(updatedPrice).toBe(42);
    expect(updatedImage).toBe('https://example.com/image.jpg');
  });

  test('EnrichLinkMetadataUseCase preserves user-provided price', async () => {
    let updatedPrice: number | null = null;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        source: 'fetch',
        data: {
          title: 'Ignored',
          price: 99,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: 'https://example.com/image.jpg',
        },
      }),
    };

    const mockRepo: Pick<ItemRepository, 'updateLinkMetadata'> = {
      updateLinkMetadata: async (_linkId, price) => {
        updatedPrice = price;
      },
    };

    const useCase = new EnrichLinkMetadataUseCase(
      mockScraper,
      mockRepo as ItemRepository
    );

    await useCase.execute('link-1', 'https://example.com/product', 50);

    expect(updatedPrice).toBe(50);
  });
});

describe('CheerioPlaywrightMetadataScraper failover', () => {
  test('falls back to playwright when fetch result is invalid', async () => {
    let playwrightCalled = false;

    const { CheerioPlaywrightMetadataScraper } = await import(
      '@/modules/item/infrastructure/cheerio-playwright-metadata-scraper'
    );

    const scraper = new CheerioPlaywrightMetadataScraper(
      async () => CLOUDFLARE_HTML,
      async () => {
        playwrightCalled = true;
        return PRODUCT_HTML;
      }
    );

    const result = await scraper.scrape(
      'https://blocked.example.com/headphones/wireless-bluetooth-headphones',
      'full'
    );

    expect(playwrightCalled).toBe(true);
    expect(result.source).toBe('playwright');
    expect(result.data.title).toBe('Wireless Bluetooth Headphones');
  });
});
