import { describe, expect, test } from 'bun:test';
import { Email } from '@/common/domain/email.vo';
import { Money } from '@/common/domain/money.vo';
import { Username, USERNAME_EMAIL_MESSAGE } from '@/common/domain/username.vo';
import { validateUsernamePolicy, isUsernamePolicySatisfied } from '@/common/domain/username-policy';
import { ListRole } from '@/common/domain/list-role.vo';
import { DomainError } from '@/common/domain/errors/domain-error';
import { AppError } from '@/common/middlewares/error.middleware';

describe('domain value objects', () => {
  test('Email.create validates format', () => {
    expect(Email.create('user@example.com').toString()).toBe('user@example.com');
    expect(() => Email.create('invalid')).toThrow(DomainError);
  });

  test('Money.create parses numeric strings', () => {
    expect(Money.create('$19.99')?.toNumber()).toBe(19.99);
    expect(Money.create(null)).toBeNull();
    expect(() => Money.create(-5)).toThrow(DomainError);
  });

  test('Username.create enforces length and charset', () => {
    expect(Username.create('gift_user').toString()).toBe('gift_user');
    expect(Username.create('valid_user-1').toString()).toBe('valid_user-1');
    expect(() => Username.create('ab')).toThrow(DomainError);
  });

  test('Username.create rejects email addresses', () => {
    expect(() => Username.create('user@example.com')).toThrow(DomainError);
    try {
      Username.create('user@example.com');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).message).toBe(USERNAME_EMAIL_MESSAGE);
    }
    expect(() => Username.create('foo@bar')).toThrow(DomainError);
  });

  test('validateUsernamePolicy maps DomainError to AppError', () => {
    expect(validateUsernamePolicy('good_user')).toBe('good_user');
    expect(isUsernamePolicySatisfied('user@example.com')).toBe(false);
    try {
      validateUsernamePolicy('user@example.com');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toBe(USERNAME_EMAIL_MESSAGE);
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  test('ListRole.isAtLeast compares hierarchy', () => {
    expect(ListRole.create('owner').isAtLeast('collaborator')).toBe(true);
    expect(ListRole.create('viewer').isAtLeast('collaborator')).toBe(false);
  });
});
