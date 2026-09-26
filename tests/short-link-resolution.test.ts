import { describe, expect, test } from 'bun:test';
import {
  isPrivateScrapeHostname,
  resolveScrapeFinalUrl,
  htmlLooksLikeContinueShoppingShell,
} from '../src/modules/item/infrastructure/scraping/utils/resolve-scrape-final-url.util';
import { validateScrapeResult } from '../src/modules/item/infrastructure/scraping/utils/validate-scrape-result.util';
import { MetadataScraperOrchestrator } from '../src/modules/item/infrastructure/adapters/metadata-scraper.orchestrator';

describe('resolveScrapeFinalUrl', () => {
  test('accepts public https product URLs', () => {
    expect(resolveScrapeFinalUrl('https://www.amazon.com/dp/B0TEST', 'https://a.co/d/x')).toBe(
      'https://www.amazon.com/dp/B0TEST'
    );
  });

  test('falls back to input when candidate missing', () => {
    expect(resolveScrapeFinalUrl(null, 'https://www.amazon.com/dp/B0TEST')).toBe(
      'https://www.amazon.com/dp/B0TEST'
    );
  });

  test('rejects private hosts', () => {
    expect(resolveScrapeFinalUrl('http://192.168.1.1/p', 'https://a.co/d/x')).toBeNull();
    expect(resolveScrapeFinalUrl('http://localhost:3000/p', 'https://a.co/d/x')).toBeNull();
  });

  test('rejects credentials and non-http schemes', () => {
    expect(resolveScrapeFinalUrl('https://user:pass@shop.example/p', 'https://a.co/d/x')).toBeNull();
    expect(resolveScrapeFinalUrl('ftp://shop.example/p', 'https://a.co/d/x')).toBeNull();
  });

  test('isPrivateScrapeHostname detects RFC1918', () => {
    expect(isPrivateScrapeHostname('10.0.0.1')).toBe(true);
    expect(isPrivateScrapeHostname('amazon.com')).toBe(false);
  });
});

describe('continue shopping validation', () => {
  test('marks continue-shopping shell as blocked', () => {
    const html = `
      <!DOCTYPE html><html><head><title>Amazon.com</title></head>
      <body>${'x'.repeat(600)}
      <p>Click the button below to continue shopping</p>
      <button>Continue shopping</button>
      </body></html>
    `;
    const validation = validateScrapeResult(
      {
        title: 'Amazon.com',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      html,
      'full'
    );
    expect(validation.valid).toBe(false);
    expect(validation.blocked).toBe(true);
    expect(validation.reason).toContain('short-link-shell');
    expect(htmlLooksLikeContinueShoppingShell(html)).toBe(true);
  });
});

describe('MetadataScraperOrchestrator short-link rematch', () => {
  const amazonProductHtml = `
    <!DOCTYPE html><html><head><title>Product</title></head>
    <body>${'x'.repeat(400)}
    <span id="productTitle">Dyson V11 Cordless Vacuum</span>
    <span class="a-price"><span class="a-offscreen">$599.00</span></span>
    <img id="landingImage" src="https://m.media-amazon.com/images/I/test.jpg" />
    <div id="productDescription">Powerful cordless vacuum.</div>
    </body></html>
  `;

  const interstitialHtml = `
    <!DOCTYPE html><html><head><title>Amazon.com</title></head>
    <body>${'x'.repeat(600)}
    <p>Click the button below to continue shopping</p>
    <button>Continue shopping</button>
    </body></html>
  `;

  test('uses final amazon.com URL for retailer extraction after redirect', async () => {
    const scraper = new MetadataScraperOrchestrator(
      async () => ({
        html: amazonProductHtml,
        finalUrl: 'https://www.amazon.com/dp/B0TEST123',
      }),
      async () => {
        throw new Error('playwright should not run');
      }
    );

    const result = await scraper.scrape('https://a.co/d/0d2Xk8eG', 'full');
    expect(result.finalUrl).toBe('https://www.amazon.com/dp/B0TEST123');
    expect(result.data.title).toContain('Dyson');
    expect(result.data.price).toBe(599);
    expect(result.websiteName?.toLowerCase()).toContain('amazon');
  });

  test('falls back to playwright when fetch returns continue-shopping shell', async () => {
    let playwrightCalled = false;
    const scraper = new MetadataScraperOrchestrator(
      async () => ({
        html: interstitialHtml,
        finalUrl: 'https://a.co/d/0d2Xk8eG',
      }),
      async () => {
        playwrightCalled = true;
        return {
          html: amazonProductHtml,
          capturedJson: [],
          finalUrl: 'https://www.amazon.com/dp/B0TEST123',
        };
      }
    );

    const result = await scraper.scrape('https://a.co/d/0d2Xk8eG', 'full');
    expect(playwrightCalled).toBe(true);
    expect(result.finalUrl).toBe('https://www.amazon.com/dp/B0TEST123');
    expect(result.data.title).toContain('Dyson');
  });
});
