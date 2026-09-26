function secureCookieFlag(): string {
  return process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
}

export function setJwtCookie(set: { headers: Record<string, string | number | undefined> }, token: string): void {
  set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureCookieFlag()}SameSite=Strict; Path=/; Max-Age=86400`;
}

export function clearJwtCookie(set: { headers: Record<string, string | number | undefined> }): void {
  set.headers['Set-Cookie'] = `jwt=; HttpOnly; ${secureCookieFlag()}SameSite=Strict; Path=/; Max-Age=0`;
}

export function setPasskeyChallengeCookie(
  set: { headers: Record<string, string | number | undefined> },
  challenge: string
): void {
  set.headers['Set-Cookie'] =
    `passkey_challenge=${encodeURIComponent(challenge)}; HttpOnly; ${secureCookieFlag()}SameSite=Strict; Path=/; Max-Age=300`;
}
