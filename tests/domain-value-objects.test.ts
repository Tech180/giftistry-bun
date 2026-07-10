import { describe, expect, test } from 'bun:test';
import { Email } from '@/common/domain/email.vo';
import { Money } from '@/common/domain/money.vo';
import { Username } from '@/common/domain/username.vo';
import { ListRole } from '@/common/domain/list-role.vo';
import { DomainError } from '@/common/domain/errors/domain-error';

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
    expect(() => Username.create('ab')).toThrow(DomainError);
  });

  test('ListRole.isAtLeast compares hierarchy', () => {
    expect(ListRole.create('owner').isAtLeast('collaborator')).toBe(true);
    expect(ListRole.create('viewer').isAtLeast('collaborator')).toBe(false);
  });
});
