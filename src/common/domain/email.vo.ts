import { DomainError } from './errors/domain-error';
import { EMAIL_REGEX } from './constants/email.constant';

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      throw new DomainError('Invalid email address');
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
