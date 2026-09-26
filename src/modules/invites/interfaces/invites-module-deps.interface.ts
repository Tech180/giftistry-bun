import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { EventBus } from '@/common/domain/ports/event-bus.port';
import type { UserRepository } from '@/modules/auth';
import type { ListItemsPort } from '@/modules/item';
import type { ListShareRepository, WishlistRepository } from '@/modules/wishlist';
import type { InviteGuestRealtimePort } from '../domain/ports/invite-guest-realtime.port';
import type { ListEmailInviteRepository } from '../domain/ports/list-email-invite.repository';
import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';

export interface InvitesModuleDeps {
  linkTokenRepo: ListLinkTokenRepository;
  emailInviteRepo: ListEmailInviteRepository;
  listShareRepo: ListShareRepository;
  userRepo: UserRepository;
  wishlistRepo: WishlistRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  eventBus: EventBus;
  listItems: ListItemsPort;
  guestRealtime?: InviteGuestRealtimePort | null;
}
