import { describe, expect, test } from 'bun:test';
import { AppError } from '../src/common/middlewares/error.middleware';
import { assertCanMutateAdminUser } from '../src/modules/admin/application/assert-can-mutate-admin-user';

describe('assertCanMutateAdminUser', () => {
  test('allows non-owner target for any actor', () => {
    expect(() => assertCanMutateAdminUser('admin-1', 'user-2', false)).not.toThrow();
  });

  test('allows owner acting on themselves', () => {
    expect(() => assertCanMutateAdminUser('owner-1', 'owner-1', true)).not.toThrow();
  });

  test('rejects non-owner mutating the owner', () => {
    try {
      assertCanMutateAdminUser('admin-1', 'owner-1', true);
      throw new Error('expected AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(403);
      expect((err as AppError).message).toBe('Cannot modify the server owner');
    }
  });
});
