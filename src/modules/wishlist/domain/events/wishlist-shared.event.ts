import { DomainEvent } from '@/common/domain/events/domain-event';
import type { ShareRole } from '../list-share.entity';

export class WishlistSharedEvent extends DomainEvent {
  readonly eventName = 'wishlist.shared';

  constructor(
    public readonly recipientId: string,
    public readonly listId: string,
    public readonly role: ShareRole,
    public readonly body: string,
    public readonly sharedBy?: string
  ) {
    super();
  }
}
