import { parsePrice } from '../../../../domain/utils/parse-price.util';

/** Thin wrapper keeping existing extractor call sites on a number | null API. */
export function parseScrapePrice(value: unknown): number | null {
  return parsePrice(value)?.amount ?? null;
}
