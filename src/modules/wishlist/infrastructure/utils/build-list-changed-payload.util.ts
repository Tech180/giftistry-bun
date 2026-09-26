import type { ListChangedEvent } from '../../domain/interfaces/list-changed-event.interface';

export function buildListChangedPayload(event: ListChangedEvent): Record<string, unknown> {
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
