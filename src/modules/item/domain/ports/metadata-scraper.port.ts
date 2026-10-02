import type { ScrapeMode } from '../types/scrape-mode.type';
import type { ScrapeResult } from '../interfaces/scrape-result.interface';
import type { ScrapeCaptureInput } from '../interfaces/scrape-capture-input.interface';
import type { MetadataScrapeOptions } from '../interfaces/metadata-scrape-options.interface';

export interface MetadataScraper {
  scrape(url: string, mode?: ScrapeMode, options?: MetadataScrapeOptions): Promise<ScrapeResult>;
  /** Extract from user-supplied HTML/JSON (no server fetch). */
  scrapeFromCapture(
    url: string,
    capture: ScrapeCaptureInput,
    mode?: ScrapeMode,
    options?: MetadataScrapeOptions
  ): Promise<ScrapeResult>;
  /** Follow redirects and return a safe final URL, or null when unsafe/unreachable. */
  resolveFinalUrl(url: string): Promise<string | null>;
}
