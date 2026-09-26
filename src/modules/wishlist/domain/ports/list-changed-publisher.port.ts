import type { ListChangedEvent } from '../interfaces/list-changed-event.interface';

export interface ListChangedPublisher {
  publish(listId: string, event: ListChangedEvent): void;
}
