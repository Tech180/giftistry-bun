import { createHash, randomBytes } from 'crypto';

export function generateInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = hashInviteToken(token);
  return { token, hash };
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
