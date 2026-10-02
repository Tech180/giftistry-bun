import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';

export function resolvePartialScrapeOutcome(blocked?: boolean): FetchOutcomeKind {
  return blocked ? 'blocked' : 'empty';
}
