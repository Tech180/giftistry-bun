import type { ScrapeSource } from '../types/scrape-source.type';
import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';

export class ScrapeError extends Error {
  readonly diagnostics?: {
    blocked?: boolean;
    validationReason?: string;
    finalUrl?: string;
    tier?: ScrapeSource;
    outcome?: FetchOutcomeKind;
  };

  constructor(
    message: string,
    diagnostics?: {
      blocked?: boolean;
      validationReason?: string;
      finalUrl?: string;
      tier?: ScrapeSource;
      outcome?: FetchOutcomeKind;
    }
  ) {
    super(message);
    this.name = 'ScrapeError';
    this.diagnostics = diagnostics;
  }
}
