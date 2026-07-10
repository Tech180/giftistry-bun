import type { DomainEvent } from '@/common/domain/events/domain-event';
import type { EventBus, EventHandler } from '@/common/domain/events/event-bus.port';

export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe<T extends DomainEvent>(
    eventType: { new (...args: never[]): T; prototype: T },
    handler: EventHandler<T>
  ): void {
    const eventName = new eventType().eventName;
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventName, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }
}
