import { describe, expect, it } from 'bun:test';
import { DomainError } from '@/common/domain/errors/domain-error';
import {
  PASSWORD_MIN_LENGTH_BASIC,
  PASSWORD_MIN_LENGTH_STRONG,
  PASSWORD_POLICY_MESSAGE_BASIC,
  PASSWORD_POLICY_MESSAGE_STRONG,
} from '@/common/domain/constants/password-policy.constant';
import { validatePasswordPolicy } from '@/common/domain/utils/validate-password-policy.util';

describe('validatePasswordPolicy', () => {
  it('accepts a strong password by default', () => {
    expect(() => validatePasswordPolicy('securepass1')).not.toThrow();
  });

  it('rejects empty passwords', () => {
    expect(() => validatePasswordPolicy('')).toThrow(DomainError);
    expect(() => validatePasswordPolicy('   ')).toThrow(PASSWORD_POLICY_MESSAGE_STRONG);
  });

  it('rejects short passwords when strong', () => {
    expect(() => validatePasswordPolicy('abc1')).toThrow(PASSWORD_POLICY_MESSAGE_STRONG);
    expect(PASSWORD_MIN_LENGTH_STRONG).toBe(8);
  });

  it('rejects passwords missing letter or digit when strong', () => {
    expect(() => validatePasswordPolicy('12345678')).toThrow(PASSWORD_POLICY_MESSAGE_STRONG);
    expect(() => validatePasswordPolicy('abcdefgh')).toThrow(PASSWORD_POLICY_MESSAGE_STRONG);
  });

  it('accepts basic passwords when strong policy is off', () => {
    expect(() => validatePasswordPolicy('abcdef', { requireStrong: false })).not.toThrow();
    expect(PASSWORD_MIN_LENGTH_BASIC).toBe(6);
  });

  it('rejects short passwords when strong policy is off', () => {
    expect(() => validatePasswordPolicy('abc', { requireStrong: false })).toThrow(
      PASSWORD_POLICY_MESSAGE_BASIC
    );
  });
});
