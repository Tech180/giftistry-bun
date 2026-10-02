import type { ServerConfigRepository } from '@/modules/system';
import type { ProductResearcher } from '../../domain/ports/product-researcher.port';
import type { ProductResearchInput } from '../../domain/interfaces/product-research-input.interface';
import { PlaywrightProductResearcher } from './playwright-product-researcher';
import { SearxngProductResearcher } from './searxng-product-researcher';

/** Routes web research to SearXNG when configured, otherwise DuckDuckGo via Playwright. */
export class ConfigurableProductResearcher implements ProductResearcher {
  private readonly searxng: SearxngProductResearcher;
  private readonly duckDuckGo: PlaywrightProductResearcher;

  constructor(configRepo: ServerConfigRepository) {
    this.searxng = new SearxngProductResearcher(configRepo);
    this.duckDuckGo = new PlaywrightProductResearcher();
  }

  research(input: ProductResearchInput): Promise<string> {
    if (this.searxng.canHandle()) {
      return this.searxng.research(input);
    }
    return this.duckDuckGo.research(input);
  }
}
