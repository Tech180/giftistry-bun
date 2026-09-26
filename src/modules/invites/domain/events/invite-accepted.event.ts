import { DomainEvent } from '@/common/domain/events/domain-event';
import type { InviteType } from '../types/invite-type.type';

export class InviteAcceptedEvent extends DomainEvent {
  readonly eventName = 'invite.accepted';

  constructor(
    public readonly listOwnerId: string,
    public readonly listId: string,
    public readonly accepterId: string,
    public readonly inviteType: InviteType,
    public readonly body: string
  ) {
    super();
  }
}
