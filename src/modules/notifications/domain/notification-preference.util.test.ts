import { describe, expect, test } from 'bun:test';
import { shouldCreateNotification } from './notification-preference.util';
import type { NotificationPrefs } from './notification.entity';

const basePrefs: NotificationPrefs = {
  UserId: 'u1',
  EmailAlerts: true,
  Marketing: false,
  FriendRequests: true,
  ListShares: true,
  ItemClaims: true,
  Comments: true,
  JobCompletions: true,
  PushAlerts: true,
  UpdatedAt: new Date(),
};

describe('shouldCreateNotification', () => {
  test('allows friend_request when FriendRequests on', () => {
    expect(shouldCreateNotification('friend_request', basePrefs)).toBe(true);
  });

  test('blocks friend_request when FriendRequests off', () => {
    expect(
      shouldCreateNotification('friend_request', { ...basePrefs, FriendRequests: false })
    ).toBe(false);
  });

  test('blocks list_shared when ListShares off', () => {
    expect(shouldCreateNotification('list_shared', { ...basePrefs, ListShares: false })).toBe(
      false
    );
  });

  test('blocks job_completed when JobCompletions off', () => {
    expect(
      shouldCreateNotification('job_completed', { ...basePrefs, JobCompletions: false })
    ).toBe(false);
  });

  test('blocks item_deleted when ItemClaims off', () => {
    expect(
      shouldCreateNotification('item_deleted', { ...basePrefs, ItemClaims: false })
    ).toBe(false);
  });

  test('allows item_deleted when ItemClaims on', () => {
    expect(shouldCreateNotification('item_deleted', basePrefs)).toBe(true);
  });

  test('always allows system', () => {
    expect(
      shouldCreateNotification('system', {
        ...basePrefs,
        FriendRequests: false,
        ListShares: false,
        JobCompletions: false,
      })
    ).toBe(true);
  });
});
