export type ListChangedReason =
  | 'item.created'
  | 'item.updated'
  | 'item.deleted'
  | 'claim.changed'
  | 'item.links'
  | 'item.related'
  | 'item.substitution'
  | 'list.updated';

export interface ListChangedEvent {
  reason: ListChangedReason;
  itemId?: string;
  actorUserId?: string;
}

export interface ListChangedPublisher {
  publish(listId: string, event: ListChangedEvent): void;
}
