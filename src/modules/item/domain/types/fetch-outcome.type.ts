import type { FetchOutcomeKind } from './fetch-outcome-kind.type';

/** Full acquisition result from a single strategy or the ladder. */
export type FetchOutcome =
  | FetchOutcomeOk
  | FetchOutcomeTerminal
  | FetchOutcomeEscalate;

export interface FetchOutcomeOk {
  kind: 'ok';
  outcome: Extract<FetchOutcomeKind, 'ok'>;
  status: number;
  html: string;
  finalUrl: string;
  strategy: string;
  capturedJson?: unknown[];
  contentType?: string | null;
}

/** Outcomes that stop the ladder without a usable page. */
export interface FetchOutcomeTerminal {
  kind: 'terminal';
  outcome: Extract<FetchOutcomeKind, 'not-found' | 'unsafe-url' | 'non-html' | 'empty'>;
  strategy: string;
  status?: number;
  finalUrl?: string;
  html?: string;
  message?: string;
}

/** Outcomes that allow trying the next strategy. */
export interface FetchOutcomeEscalate {
  kind: 'escalate';
  outcome: Extract<
    FetchOutcomeKind,
    'blocked' | 'login-wall' | 'geo-blocked' | 'timeout' | 'busy' | 'error'
  >;
  strategy: string;
  status?: number;
  finalUrl?: string;
  html?: string;
  message?: string;
  capturedJson?: unknown[];
}

export function isFetchOutcomeOk(outcome: FetchOutcome): outcome is FetchOutcomeOk {
  return outcome.kind === 'ok';
}

export function isFetchOutcomeTerminal(outcome: FetchOutcome): outcome is FetchOutcomeTerminal {
  return outcome.kind === 'terminal';
}
