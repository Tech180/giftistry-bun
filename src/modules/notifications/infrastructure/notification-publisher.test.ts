import { describe, expect, test } from 'bun:test';
import {
  setNotificationPublisher,
  publishNotification,
} from './notification-publisher';
import type { Notification } from '../domain/notification.entity';

describe('notification-publisher', () => {
  test('no-ops when publisher unset', () => {
    setNotificationPublisher(null);
    expect(() =>
      publishNotification('u1', {
        Id: 'n1',
        UserId: 'u1',
        Type: 'system',
        Title: 't',
        Message: 'm',
        Metadata: {},
        ReadAt: null,
        CreatedAt: new Date(),
      })
    ).not.toThrow();
  });

  test('publishes notification.received with Notification payload', () => {
    const calls: { userId: string; payload: Record<string, unknown> }[] = [];
    setNotificationPublisher((userId, payload) => {
      calls.push({ userId, payload });
    });

    const notification: Notification = {
      Id: 'n1',
      UserId: 'u1',
      Type: 'friend_request',
      Title: 'Hi',
      Message: 'There',
      Metadata: { RequestId: 'r1' },
      ReadAt: null,
      CreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    publishNotification('u1', notification);

    expect(calls).toHaveLength(1);
    expect(calls[0].userId).toBe('u1');
    expect(calls[0].payload.Type).toBe('notification.received');
    expect(calls[0].payload.Notification).toEqual(notification);

    setNotificationPublisher(null);
  });
});
