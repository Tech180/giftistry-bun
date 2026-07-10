export abstract class DomainEvent {
  readonly occurredAt = new Date();
  abstract readonly eventName: string;
}
