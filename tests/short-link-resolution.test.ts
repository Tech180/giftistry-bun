import { describe, expect, test } from 'bun:test';
import { isPrivateNetworkAddress } from '../src/modules/item/domain/utils/is-private-network-address.util';
import { resolveScrapeFinalUrl } from '../src/modules/item/domain/utils/scrape-url-safety.util';
import { htmlLooksLikeContinueShoppingShell } from '../src/modules/item/infrastructure/scraping/utils/html-looks-like-continue-shopping-shell.util';
import { validateScrapeResult } from '../src/modules/item/infrastructure/scraping/utils/validate-scrape-result.util';
import { MetadataScraperOrchestrator } from '../src/modules/item/infrastructure/adapters/metadata-scraper.orchestrator';
import { ScrapeError } from '../src/modules/item/domain/errors/scrape-error';

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

  test('isPrivateNetworkAddress detects RFC1918', () => {
    expect(isPrivateNetworkAddress('10.0.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('amazon.com')).toBe(false);
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
      'full',
      { url: 'https://www.amazon.com/dp/B0TEST1234' }
    );
    expect(validation.valid).toBe(false);
    expect(validation.blocked).toBe(true);
    expect(validation.reason).toContain('short-link-shell');
    expect(htmlLooksLikeContinueShoppingShell(html)).toBe(true);
  });

  test('prefers short-link-shell over bot-check when captcha appears on gate page', () => {
    const html = `
      <!DOCTYPE html><html><head><title>Amazon.com</title></head>
      <body>${'x'.repeat(600)}
      <p>Click the button below to continue shopping</p>
      <p>Solve this captcha to continue</p>
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
      'full',
      { url: 'https://a.co/d/09RD8uDq' }
    );
    expect(validation.valid).toBe(false);
    expect(validation.blocked).toBe(true);
    expect(validation.reason).toContain('short-link-shell');
    expect(validation.reason).not.toContain('bot-check');
  });
});

describe('MetadataScraperOrchestrator short-link rematch', () => {
  const productAsin = 'B0TEST1234';
  const productUrl = `https://www.amazon.com/dp/${productAsin}`;
  const shortUrl = 'https://a.co/d/0d2Xk8eG';
  const decoyUrl =
    'https://www.amazon.com/fmc/everyday-essentials-category?node=16310101&ref_=eemb_redirect_grocery';

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

  const decoyHtml = `
    <!DOCTYPE html><html><head><title>Everyday Essentials</title></head>
    <body>${'x'.repeat(600)}
    <h1>Grocery</h1>
    <p>Browse aisles</p>
    </body></html>
  `;

  test('skips fetch product tier for Amazon and uses playwright with postGateUrl', async () => {
    let fetchCalls = 0;
    let playwrightCalled = false;
    let receivedPostGate: string | undefined;

    const scraper = new MetadataScraperOrchestrator(
      async () => {
        fetchCalls += 1;
        return {
          html: interstitialHtml,
          finalUrl: productUrl,
        };
      },
      async (inputUrl, _timeout, options) => {
        playwrightCalled = true;
        receivedPostGate = options?.postGateUrl;
        expect(inputUrl).toBe(shortUrl);
        return {
          html: amazonProductHtml,
          capturedJson: [],
          finalUrl: productUrl,
        };
      }
    );

    const result = await scraper.scrape(shortUrl, 'full');
    expect(fetchCalls).toBe(1);
    expect(playwrightCalled).toBe(true);
    expect(receivedPostGate).toBe(productUrl);
    expect(result.finalUrl).toBe(productUrl);
    expect(result.data.title).toContain('Dyson');
    expect(result.data.price).toBe(599);
    expect(result.websiteName?.toLowerCase()).toContain('amazon');
    expect(result.diagnostics.source).toBe('playwright');
  });

  test('uses playwright when Amazon pre-resolve stays on short link', async () => {
    let playwrightCalled = false;
    const scraper = new MetadataScraperOrchestrator(
      async () => ({
        html: interstitialHtml,
        finalUrl: shortUrl,
      }),
      async () => {
        playwrightCalled = true;
        return {
          html: amazonProductHtml,
          capturedJson: [],
          finalUrl: productUrl,
        };
      }
    );

    const result = await scraper.scrape(shortUrl, 'full');
    expect(playwrightCalled).toBe(true);
    expect(result.finalUrl).toBe(productUrl);
    expect(result.data.title).toContain('Dyson');
  });

  test('ignores decoy pre-resolve and does not pass decoy as postGateUrl', async () => {
    let receivedPostGate: string | undefined;

    const scraper = new MetadataScraperOrchestrator(
      async () => ({
        html: decoyHtml,
        finalUrl: decoyUrl,
      }),
      async (inputUrl, _timeout, options) => {
        receivedPostGate = options?.postGateUrl;
        expect(inputUrl).toBe(shortUrl);
        return {
          html: amazonProductHtml,
          capturedJson: [],
          finalUrl: productUrl,
        };
      }
    );

    const result = await scraper.scrape(shortUrl, 'full');
    expect(receivedPostGate).toBeUndefined();
    expect(result.finalUrl).toBe(productUrl);
    expect(result.data.title).toContain('Dyson');
  });

  test('throws blocked when Playwright lands on non-product Amazon page', async () => {
    const scraper = new MetadataScraperOrchestrator(
      async () => ({
        html: decoyHtml,
        finalUrl: decoyUrl,
      }),
      async () => ({
        html: decoyHtml,
        capturedJson: [],
        finalUrl: decoyUrl,
      })
    );

    try {
      await scraper.scrape(shortUrl, 'full');
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ScrapeError);
      if (err instanceof ScrapeError) {
        expect(err.diagnostics?.blocked).toBe(true);
        expect(err.diagnostics?.validationReason).toBe('amazon-non-product-landing');
        expect(err.diagnostics?.finalUrl).toBe(shortUrl);
      }
    }
  });

  test('canonicalizes tracking /dp URLs and skips HTTP pre-resolve', async () => {
    const trackingUrl =
      'https://www.amazon.com/ElecVoztile-Protection/dp/B0FRMQJGJB/?pd_rd_w=AzNLd&pf_rd_r=ABC';
    let fetchCalls = 0;
    let playwrightInput: string | undefined;
    let receivedPostGate: string | undefined;

    const scraper = new MetadataScraperOrchestrator(
      async () => {
        fetchCalls += 1;
        return { html: interstitialHtml, finalUrl: trackingUrl };
      },
      async (inputUrl, _timeout, options) => {
        playwrightInput = inputUrl;
        receivedPostGate = options?.postGateUrl;
        return {
          html: amazonProductHtml.replace('B0TEST1234', 'B0FRMQJGJB'),
          capturedJson: [],
          finalUrl: 'https://www.amazon.com/dp/B0FRMQJGJB',
        };
      }
    );

    const result = await scraper.scrape(trackingUrl, 'full');
    expect(fetchCalls).toBe(0);
    expect(playwrightInput).toBe('https://www.amazon.com/dp/B0FRMQJGJB');
    expect(receivedPostGate).toBeUndefined();
    expect(result.finalUrl).toBe('https://www.amazon.com/dp/B0FRMQJGJB');
    expect(result.data.title).toContain('Dyson');
  });
});
