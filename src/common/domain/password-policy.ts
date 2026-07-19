import { AppError } from '@/common/middlewares/error.middleware';

/** Minimum length when strong passwords are required. */
export const PASSWORD_MIN_LENGTH_STRONG = 8;

/** Floor length when strong passwords are disabled. */
export const PASSWORD_MIN_LENGTH_BASIC = 6;

/** @deprecated Use PASSWORD_MIN_LENGTH_STRONG */
export const PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH_STRONG;

export const PASSWORD_POLICY_MESSAGE_STRONG =
  'Password must be at least 8 characters and include at least one letter and one number';

export const PASSWORD_POLICY_MESSAGE_BASIC =
  'Password must be at least 6 characters';

export const PASSWORD_POLICY_MESSAGE = PASSWORD_POLICY_MESSAGE_STRONG;

export interface PasswordPolicyOptions {
  /** When true (default), require 8+ chars with a letter and a number. */
  requireStrong?: boolean;
}

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
    throw new AppError(message, 400, 'BAD_REQUEST');
  }
  if (value.length < minLength) {
    throw new AppError(message, 400, 'BAD_REQUEST');
  }
  if (requireStrong && (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value))) {
    throw new AppError(message, 400, 'BAD_REQUEST');
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
