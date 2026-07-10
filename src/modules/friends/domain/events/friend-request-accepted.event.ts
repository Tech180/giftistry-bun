import { DomainEvent } from '@/common/domain/events/domain-event';

export class FriendRequestAcceptedEvent extends DomainEvent {
  readonly eventName = 'friend_request.accepted';

  constructor(
    public readonly senderId: string,
    public readonly accepterId: string,
    public readonly requestId: string
  ) {
    super();
  }
}
