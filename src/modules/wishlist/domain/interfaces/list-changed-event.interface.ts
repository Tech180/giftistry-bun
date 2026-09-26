import type { ListChangedReason } from '../types/list-changed-reason.type';

export interface ListChangedEvent {
  reason: ListChangedReason;
  itemId?: string;
  actorUserId?: string;
}
