import { DomainError } from './errors/domain-error';

/** Same pattern as Email VO — used to reject email-shaped usernames. */
const EMAIL_LIKE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

export const USERNAME_POLICY_MESSAGE =
  'Username must be 3-32 characters (letters, numbers, _ or -)';

export const USERNAME_EMAIL_MESSAGE = 'Username cannot be an email address';

export class Username {
  private constructor(readonly value: string) {}

  static create(raw: string): Username {
    const trimmed = raw.trim();
    if (trimmed.includes('@') || EMAIL_LIKE_REGEX.test(trimmed)) {
      throw new DomainError(USERNAME_EMAIL_MESSAGE);
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      throw new DomainError(USERNAME_POLICY_MESSAGE);
    }
    return new Username(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
