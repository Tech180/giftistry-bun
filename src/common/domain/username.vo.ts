import { DomainError } from './errors/domain-error';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

export class Username {
  private constructor(readonly value: string) {}

  static create(raw: string): Username {
    const trimmed = raw.trim();
    if (!USERNAME_REGEX.test(trimmed)) {
      throw new DomainError('Username must be 3-32 characters (letters, numbers, _ or -)');
    }
    return new Username(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
