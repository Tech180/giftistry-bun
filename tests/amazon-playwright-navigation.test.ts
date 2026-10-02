import { describe, expect, test } from 'bun:test';
import type { AmazonContinueShoppingPage } from '../src/modules/item/infrastructure/scraping/interfaces/amazon-continue-shopping-page.interface';
import { runAmazonPlaywrightNavigation } from '../src/modules/item/infrastructure/scraping/utils/amazon-playwright-navigation.util';

function createFakePage(options: {
  initialUrl: string;
  gateHtml: string;
  productHtml: string;
  /** When true, first CTA click clears the gate without needing goto. */
  dismissClearsGate?: boolean;
}): AmazonContinueShoppingPage & { gotoCalls: string[] } {
  let currentUrl = options.initialUrl;
  let html = options.gateHtml;
  let dismissed = false;
  const gotoCalls: string[] = [];

  const clickable = {
    first: () => ({
      isVisible: async () => !dismissed && html.includes('Continue shopping'),
      click: async () => {
        dismissed = true;
        if (options.dismissClearsGate) {
          html = options.productHtml;
        }
        // Otherwise stay on gate until a goto — mimics stubborn interstitial.
      },
    }),
  };

  const page: AmazonContinueShoppingPage & { gotoCalls: string[] } = {
    gotoCalls,
    url: () => currentUrl,
    content: async () => html,
    locator: () => clickable,
    getByRole: () => clickable,
    waitForSelector: async () => undefined,
    waitForTimeout: async () => undefined,
    goto: async (nextUrl: string) => {
      gotoCalls.push(nextUrl);
      currentUrl = nextUrl;
      html = options.productHtml;
      dismissed = true;
    },
  };

  return page;
}

describe('runAmazonPlaywrightNavigation', () => {
  const gateHtml = `
    <!DOCTYPE html><html><body>${'x'.repeat(600)}
    <p>Click the button below to continue shopping</p>
    <button>Continue shopping</button>
    </body></html>
  `;
  const productHtml = `
    <!DOCTYPE html><html><body>${'x'.repeat(400)}
    <span id="productTitle">Test Product</span>
    </body></html>
  `;

  test('navigates to postGateUrl when still on gate after dismiss attempt', async () => {
    const page = createFakePage({
      initialUrl: 'https://a.co/d/09RD8uDq',
      gateHtml,
      productHtml,
    });

    const result = await runAmazonPlaywrightNavigation(page, {
      postGateUrl: 'https://www.amazon.com/dp/B0TEST1234',
      timeoutMs: 5000,
    });

    expect(result.usedPostGate).toBe(true);
    expect(result.usedReloadRetry).toBe(false);
    expect(page.gotoCalls).toEqual(['https://www.amazon.com/dp/B0TEST1234']);
    expect(page.url()).toBe('https://www.amazon.com/dp/B0TEST1234');
  });

  test('skips postGate when product is already reachable', async () => {
    const page = createFakePage({
      initialUrl: 'https://www.amazon.com/dp/B0TEST1234',
      gateHtml: productHtml,
      productHtml,
      dismissClearsGate: true,
    });

    const result = await runAmazonPlaywrightNavigation(page, {
      postGateUrl: 'https://www.amazon.com/dp/B0TEST1234',
      timeoutMs: 5000,
    });

    expect(result.usedPostGate).toBe(false);
    expect(result.usedReloadRetry).toBe(false);
    expect(page.gotoCalls).toEqual([]);
  });

  test('reloads canonical URL once when still gated after dismiss', async () => {
    const canonical = 'https://www.amazon.com/dp/B0TEST1234';
    const page = createFakePage({
      initialUrl: canonical,
      gateHtml,
      productHtml,
    });

    const result = await runAmazonPlaywrightNavigation(page, {
      canonicalUrl: canonical,
      timeoutMs: 5000,
    });

    expect(result.usedPostGate).toBe(false);
    expect(result.usedReloadRetry).toBe(true);
    expect(page.gotoCalls).toEqual([canonical]);
    expect(page.url()).toBe(canonical);
  });

  test('postGate then reload retry when gate survives first product goto', async () => {
    let gotoCount = 0;
    const productUrl = 'https://www.amazon.com/dp/B0TEST1234';
    let currentUrl = 'https://a.co/d/09RD8uDq';
    let html = gateHtml;
    let dismissed = false;
    const gotoCalls: string[] = [];

    const clickable = {
      first: () => ({
        isVisible: async () => !dismissed && html.includes('Continue shopping'),
        click: async () => {
          dismissed = true;
        },
      }),
    };

    const page: AmazonContinueShoppingPage & { gotoCalls: string[] } = {
      gotoCalls,
      url: () => currentUrl,
      content: async () => html,
      locator: () => clickable,
      getByRole: () => clickable,
      waitForSelector: async () => undefined,
      waitForTimeout: async () => undefined,
      goto: async (nextUrl: string) => {
        gotoCalls.push(nextUrl);
        gotoCount += 1;
        currentUrl = nextUrl;
        // First product goto still shows gate; second clears it.
        if (gotoCount >= 2) {
          html = productHtml;
          dismissed = true;
        } else {
          html = gateHtml;
          dismissed = false;
        }
      },
    };

    const result = await runAmazonPlaywrightNavigation(page, {
      postGateUrl: productUrl,
      canonicalUrl: productUrl,
      timeoutMs: 5000,
    });

    expect(result.usedPostGate).toBe(true);
    expect(result.usedReloadRetry).toBe(true);
    expect(page.gotoCalls).toEqual([productUrl, productUrl]);
  });
});
