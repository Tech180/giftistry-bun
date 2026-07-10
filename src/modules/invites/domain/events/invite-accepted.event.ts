import { DomainEvent } from '@/common/domain/events/domain-event';

export class InviteAcceptedEvent extends DomainEvent {
  readonly eventName = 'invite.accepted';

  constructor(
    public readonly listOwnerId: string,
    public readonly listId: string,
    public readonly accepterId: string,
    public readonly inviteType: 'link' | 'email',
    public readonly body: string
  ) {
    super();
  }
}
