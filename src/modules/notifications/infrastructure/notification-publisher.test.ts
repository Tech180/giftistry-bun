import { describe, expect, test } from 'bun:test';
import { WebsocketNotificationRealtimePublisher } from './websocket-notification-realtime-publisher';
import type { Notification } from '../domain/notification.entity';

describe('WebsocketNotificationRealtimePublisher', () => {
  test('no-ops when transport is unset', () => {
    const adapter = new WebsocketNotificationRealtimePublisher();
    expect(() =>
      adapter.publish('u1', {
        Id: 'n1',
        UserId: 'u1',
        Type: 'test',
        Title: 't',
        Message: 'b',
        Metadata: {},
        ReadAt: null,
        CreatedAt: new Date(),
      })
    ).not.toThrow();
  });

  test('invokes transport with notification.received payload', () => {
    const calls: Array<{ userId: string; payload: Record<string, unknown> }> = [];
    const adapter = new WebsocketNotificationRealtimePublisher();
    adapter.setTransport((userId, payload) => {
      calls.push({ userId, payload });
    });

    const notification: Notification = {
      Id: 'n1',
      UserId: 'u1',
      Type: 'test',
      Title: 'Hello',
      Message: 'World',
      Metadata: {},
      ReadAt: null,
      CreatedAt: new Date(),
    };

    adapter.publish('u1', notification);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.userId).toBe('u1');
    expect(calls[0]?.payload.Type).toBe('notification.received');
    expect(calls[0]?.payload.Notification).toEqual(notification);
  });
});
