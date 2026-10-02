import type { FetchOutcomeKind } from '../types/fetch-outcome-kind.type';

/** Map HTTP status to a fetch outcome for orchestrator short-circuits. */
export function classifyHttpFetchOutcome(status: number): FetchOutcomeKind | null {
  if (status === 404 || status === 410) {
    return 'not-found';
  }
  if (status === 401) {
    return 'login-wall';
  }
  if (status === 403) {
    return 'blocked';
  }
  if (status === 429 || status === 503) {
    return 'blocked';
  }
  if (status >= 200 && status < 300) {
    return 'ok';
  }
  return null;
}
