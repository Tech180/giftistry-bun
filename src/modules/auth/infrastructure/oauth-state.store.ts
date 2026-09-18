interface OAuthStateEntry {
  nonce: string;
  inviteToken: string | null;
  expiresAt: number;
}

const store = new Map<string, OAuthStateEntry>();
const TTL_MS = 10 * 60 * 1000;

export function saveOAuthState(state: string, nonce: string, inviteToken?: string | null): void {
  store.set(state, {
    nonce,
    inviteToken: inviteToken?.trim() || null,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function consumeOAuthState(
  state: string
): { nonce: string; inviteToken: string | null } | null {
  const entry = store.get(state);
  store.delete(state);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return { nonce: entry.nonce, inviteToken: entry.inviteToken };
}

export function purgeExpiredOAuthStates(): void {
  const now = Date.now();
  for (const [state, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(state);
    }
  }
}
