import type { ProductResearcher } from '../../domain/ports/product-researcher.port';
import type { ProductResearchInput } from '../../domain/interfaces/product-research-input.interface';
import { researchProductOnWeb } from '../utils/playwright-product-research.util';

export class PlaywrightProductResearcher implements ProductResearcher {
  async research(input: ProductResearchInput): Promise<string> {
    return researchProductOnWeb(input);
  }
}
