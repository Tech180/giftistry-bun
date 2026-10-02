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
import { AsyncSemaphore } from './utils/async-semaphore.util';
import { installPlaywrightNetworkGuard } from './utils/install-playwright-network-guard.util';
import type { PlaywrightContextLease } from './interfaces/playwright-context-lease.interface';
import { DEFAULT_PLAYWRIGHT_RECYCLE_AFTER_PAGES } from './constants/playwright-recycle-after-pages.constant';

class PlaywrightManager {
  private browser: Browser | null = null;
  private pagesSinceLaunch = 0;
  private shutdownRegistered = false;
  private readonly semaphore = new AsyncSemaphore(
    scrapingConfig.playwrightMaxConcurrent,
    scrapingConfig.queueTimeoutMs
  );
  private readonly recycleAfterPages = DEFAULT_PLAYWRIGHT_RECYCLE_AFTER_PAGES;

  private registerShutdown(): void {
    if (this.shutdownRegistered) {
      return;
    }
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

  private attachDisconnectHandler(browser: Browser): void {
    browser.on('disconnected', () => {
      if (this.browser === browser) {
        this.browser = null;
        this.pagesSinceLaunch = 0;
      }
    });
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      if (this.pagesSinceLaunch >= this.recycleAfterPages) {
        await this.browser.close().catch(() => {});
        this.browser = null;
        this.pagesSinceLaunch = 0;
      }
    }

    if (!this.browser || !this.browser.isConnected()) {
      this.pagesSinceLaunch = 0;
      const options = this.buildLaunchOptions();
      try {
        this.browser = await chromium.launch(options);
        this.attachDisconnectHandler(this.browser);
      } catch (err) {
        this.browser = null;
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

  async acquire(): Promise<PlaywrightContextLease> {
    const releaseSlot = await this.semaphore.acquire();
    this.registerShutdown();

    try {
      const browser = await this.ensureBrowser();
      const context = await browser.newContext({
        userAgent: CHROME_USER_AGENT,
        locale: 'en-US',
        viewport: { ...PLAYWRIGHT_CONTEXT_VIEWPORT },
        extraHTTPHeaders: { ...PLAYWRIGHT_CONTEXT_EXTRA_HEADERS },
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      await installPlaywrightNetworkGuard(context);
      this.pagesSinceLaunch += 1;

      let released = false;
      const release = async () => {
        if (released) {
          return;
        }
        released = true;
        await context.close().catch(() => {});
        releaseSlot();
      };

      return { context, release };
    } catch (err) {
      releaseSlot();
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.pagesSinceLaunch = 0;
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
