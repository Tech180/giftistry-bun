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

export type ListChangedPublisher = (listId: string, payload: Record<string, unknown>) => void;

let publisher: ListChangedPublisher | null = null;

export function setListChangedPublisher(fn: ListChangedPublisher | null): void {
  publisher = fn;
}

export function publishListChanged(listId: string, event: ListChangedEvent): void {
  if (!publisher || !listId) return;
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
  publisher(listId, payload);
}
