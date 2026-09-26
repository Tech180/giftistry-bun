import { DomainError } from '../errors/domain-error';
import { Username } from '../username.vo';

/**
 * Domain username policy.
 * Enforces charset/length and rejects email-shaped values.
 * Returns the trimmed, validated username string.
 */
export function validateUsernamePolicy(raw: string): string {
  try {
    return Username.create(raw).toString();
  } catch (err) {
    if (err instanceof DomainError) {
      throw new DomainError(err.message, 'BAD_REQUEST');
    }
    throw err;
  }
}

export function isUsernamePolicySatisfied(raw: string): boolean {
  try {
    validateUsernamePolicy(raw);
    return true;
  } catch {
    return false;
  }
}
