import type { ListChangedEvent } from '../../domain/interfaces/list-changed-event.interface';
import type { ListChangedPublisher } from '../../domain/ports/list-changed-publisher.port';
import type { ListChangedTransport } from '../interfaces/list-changed-transport.type';
import { buildListChangedPayload } from '../utils/build-list-changed-payload.util';

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
