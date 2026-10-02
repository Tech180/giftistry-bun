import type { PriceOffer } from './price-offer.interface';

/** Structured product object before reconciliation (e.g. JSON-LD Product). */
export interface ProductCandidate {
  name?: string;
  description?: string;
  brand?: string;
  gtin?: string;
  sku?: string;
  imageUrls?: string[];
  offers?: PriceOffer[];
  /** Raw @type tokens when known. */
  types?: string[];
  /** Source lane that produced this candidate. */
  sourceKey?: string;
}
