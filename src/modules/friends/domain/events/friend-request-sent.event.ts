import { DomainEvent } from '@/common/domain/events/domain-event';

export class FriendRequestSentEvent extends DomainEvent {
  readonly eventName = 'friend_request.sent';

  constructor(
    public readonly receiverId: string,
    public readonly senderId: string,
    public readonly requestId: string,
    public readonly senderUsername: string
  ) {
    super();
  }
}
