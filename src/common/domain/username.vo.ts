import { DomainError } from './errors/domain-error';
import { EMAIL_REGEX } from './constants/email.constant';
import {
  USERNAME_EMAIL_MESSAGE,
  USERNAME_POLICY_MESSAGE,
  USERNAME_REGEX,
} from './constants/username.constant';

export class Username {
  private constructor(readonly value: string) {}

  static create(raw: string): Username {
    const trimmed = raw.trim();
    if (trimmed.includes('@') || EMAIL_REGEX.test(trimmed)) {
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
