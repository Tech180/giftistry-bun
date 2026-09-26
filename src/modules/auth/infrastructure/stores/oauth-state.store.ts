import { OAUTH_STATE_STORE } from '../constants/oauth-state-store.constant';
import { OAUTH_STATE_TTL_MS } from '../constants/oauth-state-ttl.constant';

export function saveOAuthState(state: string, nonce: string, inviteToken?: string | null): void {
  OAUTH_STATE_STORE.set(state, {
    nonce,
    inviteToken: inviteToken?.trim() || null,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  });
}

export function consumeOAuthState(
  state: string
): { nonce: string; inviteToken: string | null } | null {
  const entry = OAUTH_STATE_STORE.get(state);
  OAUTH_STATE_STORE.delete(state);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return { nonce: entry.nonce, inviteToken: entry.inviteToken };
}

export function purgeExpiredOAuthStates(): void {
  const now = Date.now();
  for (const [state, entry] of OAUTH_STATE_STORE.entries()) {
    if (entry.expiresAt <= now) {
      OAUTH_STATE_STORE.delete(state);
    }
  }
}
