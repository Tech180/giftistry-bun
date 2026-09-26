import { DomainError } from '@/common/domain/errors/domain-error';
import {
  PASSWORD_MIN_LENGTH_BASIC,
  PASSWORD_MIN_LENGTH_STRONG,
  PASSWORD_POLICY_MESSAGE_BASIC,
  PASSWORD_POLICY_MESSAGE_STRONG,
} from '../constants/password-policy.constant';
import type { PasswordPolicyOptions } from '../interfaces/password-policy-options.interface';

/**
 * Domain password policy.
 * Strong (default): min 8 chars, at least one letter and one digit.
 * Basic: min 6 chars, no complexity rules.
 */
export function validatePasswordPolicy(
  password: string,
  options: PasswordPolicyOptions = {}
): void {
  const requireStrong = options.requireStrong !== false;
  const value = password ?? '';
  const message = requireStrong ? PASSWORD_POLICY_MESSAGE_STRONG : PASSWORD_POLICY_MESSAGE_BASIC;
  const minLength = requireStrong ? PASSWORD_MIN_LENGTH_STRONG : PASSWORD_MIN_LENGTH_BASIC;

  if (!value || !value.trim()) {
    throw new DomainError(message, 'BAD_REQUEST');
  }

  if (value.length < minLength) {
    throw new DomainError(message, 'BAD_REQUEST');
  }

  if (requireStrong && (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value))) {
    throw new DomainError(message, 'BAD_REQUEST');
  }
}

export function isPasswordPolicySatisfied(
  password: string,
  options: PasswordPolicyOptions = {}
): boolean {
  try {
    validatePasswordPolicy(password, options);
    return true;
  } catch {
    return false;
  }
}
