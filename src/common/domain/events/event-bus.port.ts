import type { DomainEvent } from './domain-event';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: { new (...args: never[]): T; prototype: T },
    handler: EventHandler<T>
  ): void;
}
