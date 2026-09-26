import type { ProductResearchInput } from '../interfaces/product-research-input.interface';

export interface ProductResearcher {
  research(input: ProductResearchInput): Promise<string>;
}
