import type { ScrapeSource } from '../../../domain/types/scrape-source.type';

export function mapStrategyToSource(strategy: string): ScrapeSource {
  return strategy === 'playwright' ? 'playwright' : 'fetch';
}
