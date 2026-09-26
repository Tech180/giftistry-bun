import { DomainEvent } from '@/common/domain/events/domain-event';

export class ItemRemovedEvent extends DomainEvent {
  readonly eventName = 'item.removed';

  constructor(
    public readonly claimerUserIds: string[],
    public readonly itemName: string,
    public readonly listId: string,
    public readonly listTitle: string
  ) {
    super();
  }
}
