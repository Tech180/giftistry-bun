import type { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import { CHROME_USER_AGENT } from './browser-headers';
import { scrapingConfig } from './scraping-config';

class PlaywrightManager {
  private browser: Browser | null = null;
  private activeScrapes = 0;
  private readonly maxConcurrent = scrapingConfig.playwrightMaxConcurrent;
  private shutdownRegistered = false;

  private registerShutdown(): void {
    if (this.shutdownRegistered) return;
    this.shutdownRegistered = true;

    const shutdown = () => {
      void this.shutdown();
    };

    process.on('beforeExit', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: scrapingConfig.playwrightHeadless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
    }
    return this.browser;
  }

  async acquire(): Promise<BrowserContext> {
    while (this.activeScrapes >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.registerShutdown();
    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      userAgent: CHROME_USER_AGENT,
      locale: 'en-US',
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    this.activeScrapes += 1;
    return context;
  }

  async release(context: BrowserContext): Promise<void> {
    try {
      await context.close();
    } finally {
      this.activeScrapes = Math.max(0, this.activeScrapes - 1);
    }
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const playwrightManager = new PlaywrightManager();
