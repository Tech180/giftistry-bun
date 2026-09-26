export function sanitizeOauthUsername(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 50);
  return cleaned.length >= 3 ? cleaned : `user_${crypto.randomUUID().slice(0, 8)}`;
}
