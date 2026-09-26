import { describe, expect, test } from 'bun:test';
import { DomainError } from '../src/common/domain/errors/domain-error';
import { AdminUser } from '../src/modules/admin/domain/admin-user.entity';

describe('AdminUser.assertCanMutate', () => {
  test('allows non-owner target for any actor', () => {
    expect(() => AdminUser.assertCanMutate('admin-1', 'user-2', false)).not.toThrow();
  });

  test('allows owner acting on themselves', () => {
    expect(() => AdminUser.assertCanMutate('owner-1', 'owner-1', true)).not.toThrow();
  });

  test('rejects non-owner mutating the owner', () => {
    try {
      AdminUser.assertCanMutate('admin-1', 'owner-1', true);
      throw new Error('expected DomainError');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).statusCode).toBe(403);
      expect((err as DomainError).message).toBe('Cannot modify the server owner');
    }
  });
});
