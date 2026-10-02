import type { Browser, BrowserContext, LaunchOptions, Page } from 'playwright';
import { chromium } from 'playwright';
import { CHROME_USER_AGENT } from './constants/chrome-user-agent.constant';
import {
  PLAYWRIGHT_CONTEXT_EXTRA_HEADERS,
  PLAYWRIGHT_CONTEXT_VIEWPORT,
  PLAYWRIGHT_LAUNCH_ARGS,
} from './constants/playwright-launch.constant';
import { scrapingConfig } from './utils/scraping-config.util';
import {
  playwrightLaunchHint,
  requirePlaywrightExecutableForLaunch,
} from './utils/resolve-playwright-executable.util';

class PlaywrightManager {
  private browser: Browser | null = null;
  private sharedContext: BrowserContext | null = null;
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

  private buildLaunchOptions(): LaunchOptions {
    const executablePath =
      scrapingConfig.playwrightExecutablePath ?? requirePlaywrightExecutableForLaunch();

    return {
      headless: scrapingConfig.playwrightHeadless,
      executablePath,
      args: [...PLAYWRIGHT_LAUNCH_ARGS],
    };
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.sharedContext = null;
      const options = this.buildLaunchOptions();
      try {
        this.browser = await chromium.launch(options);
      } catch (err) {
        const hint = playwrightLaunchHint(options.executablePath);
        if (hint) {
          console.error('[Playwright] Failed to launch Chromium:', err);
          throw new Error(hint);
        }
        throw err;
      }
    }
    return this.browser;
  }

  private async ensureSharedContext(browser: Browser): Promise<BrowserContext> {
    if (this.sharedContext) {
      return this.sharedContext;
    }

    const context = await browser.newContext({
      userAgent: CHROME_USER_AGENT,
      locale: 'en-US',
      viewport: { ...PLAYWRIGHT_CONTEXT_VIEWPORT },
      extraHTTPHeaders: { ...PLAYWRIGHT_CONTEXT_EXTRA_HEADERS },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    this.sharedContext = context;
    return context;
  }

  async acquire(): Promise<BrowserContext> {
    while (this.activeScrapes >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.registerShutdown();
    const browser = await this.ensureBrowser();
    const context = await this.ensureSharedContext(browser);
    this.activeScrapes += 1;
    return context;
  }

  /** Decrements the scrape semaphore. Callers must close their own pages. */
  async release(_context?: BrowserContext): Promise<void> {
    this.activeScrapes = Math.max(0, this.activeScrapes - 1);
  }

  async shutdown(): Promise<void> {
    if (this.sharedContext) {
      await this.sharedContext.close().catch(() => {});
      this.sharedContext = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const playwrightManager = new PlaywrightManager();

/** Close a page without failing the scrape cleanup path. */
export async function closePlaywrightPage(page: Page | null | undefined): Promise<void> {
  if (!page) {
    return;
  }
  await page.close().catch(() => {});
}
