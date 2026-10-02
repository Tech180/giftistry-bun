import type { ScrapeSource } from '../../../domain/types/scrape-source.type';

export class ScrapeError extends Error {
  readonly diagnostics?: {
    blocked?: boolean;
    validationReason?: string;
    finalUrl?: string;
    tier?: ScrapeSource;
  };

  constructor(
    message: string,
    diagnostics?: {
      blocked?: boolean;
      validationReason?: string;
      finalUrl?: string;
      tier?: ScrapeSource;
    }
  ) {
    super(message);
    this.name = 'ScrapeError';
    this.diagnostics = diagnostics;
  }
}
