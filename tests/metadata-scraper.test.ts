import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMetadata, extractTitleFromSlug, extractMetadata } from '@/modules/item/infrastructure/scraping/parser';
import { validateScrapeResult } from '@/modules/item/infrastructure/scraping/validators';
import { ExtractMetadataUseCase } from '@/modules/item/application/extract-metadata.use-case';
import { EnrichLinkMetadataUseCase } from '@/modules/item/application/enrich-link-metadata.use-case';
import { extractFromCapturedJson } from '@/modules/item/infrastructure/scraping/extractors/embedded-json.extractor';
import { computeConfidence, computeFieldsFound } from '@/modules/item/infrastructure/scraping/extractors/merge';
import { dicksExtractor } from '@/modules/item/infrastructure/scraping/retailers/dicks.extractor';
import { amazonExtractor } from '@/modules/item/infrastructure/scraping/retailers/amazon.extractor';
import type { MetadataScraper } from '@/modules/item/domain/ports/metadata-scraper.port';
import type { ItemRepository } from '@/modules/item/domain/ports/item.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';

const FIXTURES = join(import.meta.dir, 'fixtures/scraping');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

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
    {"@type":"Product","name":"Wireless Bluetooth Headphones","offers":{"price":"79.99"},"color":"Midnight Black","size":"Standard"}
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

const DICKS_BLOCK_HTML = loadFixture('dicks-block-page.html').padEnd(600, ' ');
const NEXT_DATA_HTML = loadFixture('next-data-product.html');
const DOM_ONLY_HTML = loadFixture('dom-only-product.html').padEnd(600, ' ');
const SHOPIFY_HTML = loadFixture('shopify-product.html').padEnd(600, ' ');
const DICKS_API_JSON = JSON.parse(loadFixture('dicks-product-api.json'));

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

  test('extracts product data from __NEXT_DATA__', () => {
    const result = parseMetadata(NEXT_DATA_HTML, 'https://shop.example.com/products/shoes', 'full');
    expect(result.title).toBe('Next.js Running Shoes');
    expect(result.price).toBe(89.99);
    expect(result.imageUrl).toBe('https://example.com/shoes.jpg');
    expect(result.color).toBe('Blue');
  });

  test('extracts product data from DOM fallback selectors', () => {
    const result = parseMetadata(DOM_ONLY_HTML, 'https://shop.example.com/shirt', 'full');
    expect(result.title).toBe('Classic Cotton T-Shirt');
    expect(result.price).toBe(24.5);
    expect(result.imageUrl).toBe('https://example.com/shirt.jpg');
    expect(result.description).toBe('Soft cotton tee for everyday wear.');
  });

  test('extracts Shopify product metadata', () => {
    const result = parseMetadata(
      SHOPIFY_HTML,
      'https://mystore.myshopify.com/products/mug',
      'full'
    );
    expect(result.title).toBe('Handmade Ceramic Mug');
    expect(result.price).toBe(18);
    expect(result.imageUrl).toBe('https://cdn.shopify.com/mug.jpg');
  });

  test('accepts Shopify pages with captcha tokens only in scripts', () => {
    const htmlWithCaptchaScript = `${SHOPIFY_HTML}<script>window.__recaptcha='h-captcha-response'</script>`;
    const result = parseMetadata(
      htmlWithCaptchaScript,
      'https://www.lttstore.com/products/netnoodz-t-shirt',
      'full'
    );
    const validation = validateScrapeResult(result, htmlWithCaptchaScript, 'full');
    expect(result.title).toBe('Handmade Ceramic Mug');
    expect(validation.valid).toBe(true);
  });
});

describe('metadata scraper validators', () => {
  test('accepts valid full scrape results', () => {
    const data = parseMetadata(PRODUCT_HTML, 'https://tech.example.com/headphones', 'full');
    const validation = validateScrapeResult(data, PRODUCT_HTML, 'full');
    expect(validation.valid).toBe(true);
    expect(validation.confidence).toBe('high');
  });

  test('rejects cloudflare block pages', () => {
    const data = parseMetadata(CLOUDFLARE_HTML, 'https://blocked.example.com/item', 'full');
    const validation = validateScrapeResult(data, CLOUDFLARE_HTML, 'full');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('cloudflare');
    expect(validation.blocked).toBe(true);
  });

  test('rejects Akamai block pages', () => {
    const data = parseMetadata(
      DICKS_BLOCK_HTML,
      'https://www.dickssportinggoods.com/p/birkenstock-sandals',
      'full'
    );
    const validation = validateScrapeResult(data, DICKS_BLOCK_HTML, 'full');
    expect(validation.valid).toBe(false);
    expect(validation.blocked).toBe(true);
    expect(validation.reason).toContain('akamai');
  });

  test('rejects generic retailer shells without usable metadata', () => {
    const data = parseMetadata(GENERIC_AMAZON_HTML, 'https://amazon.com/', 'full');
    const validation = validateScrapeResult(data, GENERIC_AMAZON_HTML, 'full');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('generic-retailer-shell');
  });

  test('rejects slug-only title in full mode', () => {
    const data = parseMetadata(
      GENERIC_AMAZON_HTML,
      'https://amazon.com/dp/wireless-bluetooth-headphones-pro',
      'full'
    );
    const extraction = extractMetadata({
      html: GENERIC_AMAZON_HTML,
      url: 'https://amazon.com/dp/wireless-bluetooth-headphones-pro',
      mode: 'full',
    });
    const validation = validateScrapeResult(data, GENERIC_AMAZON_HTML, 'full', {
      titleFromSlug: extraction.titleFromSlug,
    });
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('slug-title-only');
  });

  test('rejects full mode without price or description', () => {
    const html = '<html><head><title>Product Name</title></head><body>content</body></html>'.padEnd(
      600,
      ' '
    );
    const data = parseMetadata(html, 'https://example.com/item', 'full');
    const validation = validateScrapeResult(data, html, 'full');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('missing-price-or-description-full');
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

describe('metadata scraper confidence', () => {
  test('scores high confidence when title price and description exist', () => {
    const data = parseMetadata(PRODUCT_HTML, 'https://tech.example.com/headphones', 'full');
    expect(computeConfidence(data, false)).toBe('high');
    expect(computeFieldsFound(data)).toContain('price');
  });

  test('scores low confidence for slug-only titles', () => {
    const data = {
      title: 'Slug Title',
      price: null,
      description: null,
      color: null,
      size: null,
      category: null,
      imageUrl: null,
    };
    expect(computeConfidence(data, true)).toBe('low');
  });
});

describe('retailer extractors', () => {
  test('dicks extractor parses captured product API JSON', () => {
    const result = dicksExtractor.extract({
      html: '<html></html>',
      url: 'https://www.dickssportinggoods.com/p/test',
      mode: 'full',
      capturedJson: [DICKS_API_JSON],
    });

    expect(result.title).toBe("Birkenstock Women's Big Buckle EVA Sandals");
    expect(result.price).toBe(49.99);
    expect(result.imageUrl).toBe('https://example.com/birkenstock.jpg');
    expect(result.color).toBe('Mauve');
  });

  test('amazon extractor reads product DOM selectors', () => {
    const html = `
      <html><body>
        <span id="productTitle">Kindle Paperwhite</span>
        <span class="a-price"><span class="a-offscreen">$139.99</span></span>
        <img id="landingImage" src="https://example.com/kindle.jpg" />
      </body></html>
    `;
    const result = amazonExtractor.extract({
      html,
      url: 'https://amazon.com/dp/B123',
      mode: 'full',
    });
    expect(result.title).toBe('Kindle Paperwhite');
    expect(result.price).toBe(139.99);
    expect(result.imageUrl).toBe('https://example.com/kindle.jpg');
  });
});

describe('embedded json extractor', () => {
  test('extractFromCapturedJson walks nested product payloads', () => {
    const result = extractFromCapturedJson(
      [{ data: { productName: 'Captured Product', currentPrice: 33.33, primaryImage: 'https://x.com/a.jpg' } }],
      'full'
    );
    expect(result.title).toBe('Captured Product');
    expect(result.price).toBe(33.33);
    expect(result.imageUrl).toBe('https://x.com/a.jpg');
  });
});

describe('metadata scraper use cases', () => {
  test('ExtractMetadataUseCase delegates to MetadataScraper port', async () => {
    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          fieldsFound: ['title', 'price'],
        },
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

    const mockPopulator = { populate: async () => ({
      title: 'AI Title',
      price: null,
      description: null,
      color: null,
      size: null,
      category: null,
      imageUrl: null,
    }) };

    const mockClassifier = { classify: async () => 'uncategorized' };

    const mockUserRepo = {
      findById: async () => ({ Id: 'user-1', AiEnabled: true }),
    } as unknown as UserRepository;

    const mockAssertUserCan = {
      execute: async () => {},
    } as unknown as AssertUserCanUseCase;

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      mockUserRepo,
      mockAssertUserCan
    );
    const result = await useCase.execute('https://example.com/product', 'user-1');

    expect(result.data.title).toBe('Test Product');
    expect(result.data.price).toBe(25);
    expect(result.diagnostics.confidence).toBe('medium');
  });

  test('EnrichLinkMetadataUseCase updates link metadata from scrape result', async () => {
    let updatedPrice: number | null = null;
    let updatedImage: string | null = null;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'medium',
          fieldsFound: ['price', 'imageUrl'],
        },
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

    const useCase = new EnrichLinkMetadataUseCase(mockScraper, mockRepo as ItemRepository);

    await useCase.execute('link-1', 'https://example.com/product', null);

    expect(updatedPrice).not.toBeNull();
    expect(updatedPrice!).toBe(42);
    expect(updatedImage!).toBe('https://example.com/image.jpg');
  });

  test('EnrichLinkMetadataUseCase preserves user-provided price', async () => {
    let updatedPrice: number | null = null;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'medium',
          fieldsFound: ['price', 'imageUrl'],
        },
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

    const useCase = new EnrichLinkMetadataUseCase(mockScraper, mockRepo as ItemRepository);

    await useCase.execute('link-1', 'https://example.com/product', 50);

    expect(updatedPrice!).toBe(50);
  });

  test('EnrichLinkMetadataUseCase skips low-confidence scrape results', async () => {
    let called = false;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'playwright',
          confidence: 'low',
          fieldsFound: ['title'],
        },
        data: {
          title: 'Slug Only',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        },
      }),
    };

    const mockRepo: Pick<ItemRepository, 'updateLinkMetadata'> = {
      updateLinkMetadata: async () => {
        called = true;
      },
    };

    const useCase = new EnrichLinkMetadataUseCase(mockScraper, mockRepo as ItemRepository);
    await useCase.execute('link-1', 'https://example.com/product', null);

    expect(called).toBe(false);
  });
});

describe('MetadataScraperOrchestrator failover', () => {
  test('falls back to playwright when fetch result is invalid', async () => {
    let playwrightCalled = false;

    const { MetadataScraperOrchestrator } = await import(
      '@/modules/item/infrastructure/metadata-scraper.orchestrator'
    );

    const scraper = new MetadataScraperOrchestrator(
      async () => CLOUDFLARE_HTML,
      async () => {
        playwrightCalled = true;
        return { html: PRODUCT_HTML, capturedJson: [] };
      }
    );

    const result = await scraper.scrape(
      'https://blocked.example.com/headphones/wireless-bluetooth-headphones',
      'full'
    );

    expect(playwrightCalled).toBe(true);
    expect(result.diagnostics.source).toBe('playwright');
    expect(result.data.title).toBe('Wireless Bluetooth Headphones');
    expect(result.diagnostics.confidence).toBe('high');
  });

  test('throws ScrapeError when both tiers fail on block page', async () => {
    const { MetadataScraperOrchestrator, ScrapeError } = await import(
      '@/modules/item/infrastructure/metadata-scraper.orchestrator'
    );

    const scraper = new MetadataScraperOrchestrator(
      async () => {
        throw new Error('HTTP 403');
      },
      async () => ({ html: DICKS_BLOCK_HTML, capturedJson: [] })
    );

    try {
      await scraper.scrape('https://www.dickssportinggoods.com/p/test', 'full');
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ScrapeError);
      if (err instanceof ScrapeError) {
        expect(err.diagnostics?.blocked).toBe(true);
      }
    }
  });

  test('uses captured JSON during playwright tier', async () => {
    const { MetadataScraperOrchestrator } = await import(
      '@/modules/item/infrastructure/metadata-scraper.orchestrator'
    );

    const scraper = new MetadataScraperOrchestrator(
      async () => CLOUDFLARE_HTML,
      async () => ({
        html: '<html><head><title>Blocked</title></head><body></body></html>'.padEnd(600, ' '),
        capturedJson: [DICKS_API_JSON],
      })
    );

    const result = await scraper.scrape('https://www.dickssportinggoods.com/p/test', 'full');

    expect(result.diagnostics.source).toBe('playwright');
    expect(result.data.title).toContain('Birkenstock');
    expect(result.data.price).toBe(49.99);
  });
});

describe('scraping config', () => {
  test('loads default timeout values', async () => {
    const { scrapingConfig } = await import(
      '@/modules/item/infrastructure/scraping/scraping-config'
    );
    expect(scrapingConfig.fetchTimeoutMs).toBeGreaterThan(0);
    expect(scrapingConfig.playwrightTimeoutMs).toBeGreaterThan(0);
    expect(scrapingConfig.playwrightMaxConcurrent).toBeGreaterThan(0);
  });
});

describe('browser headers', () => {
  test('buildFetchHeaders includes sec-fetch and referer', async () => {
    const { buildFetchHeaders } = await import(
      '@/modules/item/infrastructure/scraping/browser-headers'
    );
    const headers = buildFetchHeaders('https://shop.example.com/product/1');
    expect(headers['Sec-Fetch-Mode']).toBe('navigate');
    expect(headers.Referer).toBe('https://shop.example.com/');
  });
});

describe('json-ld extractor', () => {
  test('extracts price from nested offers', async () => {
    const { jsonLdExtractor } = await import(
      '@/modules/item/infrastructure/scraping/extractors/json-ld.extractor'
    );
    const html = `<html><head><script type="application/ld+json">
      {"@graph":[{"@type":"Product","name":"Graph Product","offers":{"price":"12.34"}}]}
    </script></head></html>`;
    const result = jsonLdExtractor.extract({
      html,
      url: 'https://example.com/p',
      mode: 'full',
    });
    expect(result.title).toBe('Graph Product');
    expect(result.price).toBe(12.34);
  });
});

describe('retailer registry', () => {
  test('matchRetailer resolves amazon hostnames', async () => {
    const { matchRetailer } = await import(
      '@/modules/item/infrastructure/scraping/retailers/retailer-registry'
    );
    const { amazonExtractor } = await import(
      '@/modules/item/infrastructure/scraping/retailers/amazon.extractor'
    );
    const match = matchRetailer('www.amazon.com', [amazonExtractor]);
    expect(match?.hostnames).toContain('amazon.com');
  });
});
