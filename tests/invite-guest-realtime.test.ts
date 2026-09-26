import { describe, expect, mock, test } from 'bun:test';
import { wireDirectRealtimePublishers } from '../src/boot/runtime-publishers';
import type { RealtimePublisherAdapters } from '../src/boot/interfaces/realtime-publisher-adapters.interface';
import { guestListWsRoom } from '../src/modules/invites/infrastructure/utils/guest-list-ws-room.util';
import {
  addInviteWsConnection,
  clearInviteWsRegistry,
  notifyInviteWsRevoked,
} from '../src/modules/invites/infrastructure/stores/invite-ws.store';
import { InviteGuestRealtimeAdapter } from '../src/modules/invites/infrastructure/adapters/invite-guest-realtime.adapter';
import { WebsocketListChangedPublisher } from '../src/modules/wishlist/infrastructure/adapters/websocket-list-changed-publisher';
import { WebsocketJobProgressPublisher } from '../src/modules/jobs/infrastructure/adapters/websocket-job-progress-publisher';
import { WebsocketNotificationRealtimePublisher } from '../src/modules/notifications/infrastructure/adapters/websocket-notification-realtime-publisher';

describe('guestListWsRoom', () => {
  test('prefixes list id for guest topic', () => {
    expect(guestListWsRoom('list-abc')).toBe('guest-list:list-abc');
  });
});

describe('listChanged dual-room fanout', () => {
  test('wireDirectRealtimePublishers publishes to listId and guest-list room', () => {
    const publish = mock(() => undefined);
    const adapters: RealtimePublisherAdapters = {
      jobProgress: new WebsocketJobProgressPublisher(),
      listChanged: new WebsocketListChangedPublisher(),
      notification: new WebsocketNotificationRealtimePublisher(),
    };
    wireDirectRealtimePublishers(publish, adapters);

    adapters.listChanged.publish('list-1', { reason: 'item.created', itemId: 'item-1' });

    expect(publish).toHaveBeenCalledTimes(2);
    const rooms = publish.mock.calls.map((call) => call[0] as string);
    expect(rooms).toContain('list-1');
    expect(rooms).toContain('guest-list:list-1');
    const payloads = publish.mock.calls.map((call) => JSON.parse(call[1] as string));
    expect(payloads[0]).toEqual({ Type: 'list.changed', Reason: 'item.created', ItemId: 'item-1' });
    expect(payloads[1]).toEqual(payloads[0]);
  });
});

describe('invite guest revoke notify', () => {
  test('notifyInviteWsRevoked sends payload and closes connections', () => {
    clearInviteWsRegistry();
    const send = mock(() => undefined);
    const close = mock(() => undefined);
    addInviteWsConnection('token-a', 'ws-1', { send, close });

    notifyInviteWsRevoked('token-a', JSON.stringify({ Type: 'invite.revoked' }));

    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(send.mock.calls[0]?.[0] as string)).toEqual({ Type: 'invite.revoked' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('InviteGuestRealtimeAdapter emits invite.revoked', () => {
    clearInviteWsRegistry();
    const send = mock(() => undefined);
    const close = mock(() => undefined);
    addInviteWsConnection('token-b', 'ws-2', { send, close });

    new InviteGuestRealtimeAdapter().notifyRevoked('token-b');

    expect(JSON.parse(send.mock.calls[0]?.[0] as string)).toEqual({ Type: 'invite.revoked' });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
