import type { OAuthStateEntry } from '../interfaces/oauth-state-entry.interface';

/** In-memory OAuth CSRF state entries keyed by state token. */
export const OAUTH_STATE_STORE = new Map<string, OAuthStateEntry>();
