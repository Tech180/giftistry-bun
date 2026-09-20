import type {
  ListChangedEvent,
  ListChangedPublisher,
} from '../domain/ports/list-changed-publisher.port';

export type ListChangedTransport = (listId: string, payload: Record<string, unknown>) => void;

function buildListChangedPayload(event: ListChangedEvent): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    Type: 'list.changed',
    Reason: event.reason,
  };
  if (event.itemId) {
    payload.ItemId = event.itemId;
  }
  if (event.actorUserId) {
    payload.ActorUserId = event.actorUserId;
  }
  return payload;
}

/** Adapter: domain port → transport wired at boot (WS or Postgres fanout). */
export class WebsocketListChangedPublisher implements ListChangedPublisher {
  private transport: ListChangedTransport | null = null;

  setTransport(fn: ListChangedTransport | null): void {
    this.transport = fn;
  }

  publish(listId: string, event: ListChangedEvent): void {
    if (!this.transport || !listId) {
      return;
    }
    this.transport(listId, buildListChangedPayload(event));
  }
}
