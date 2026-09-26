import type { UserRepository } from '../../../domain/ports/user.repository';
import { sanitizeOauthUsername } from './sanitize-oauth-username.util';

export async function ensureUniqueUsername(userRepo: UserRepository, base: string): Promise<string> {
  let candidate = sanitizeOauthUsername(base);
  let suffix = 0;
  while (await userRepo.findByUsername(candidate)) {
    suffix += 1;
    candidate = sanitizeOauthUsername(`${base}${suffix}`);
  }
  return candidate;
}
