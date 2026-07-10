import { Elysia } from 'elysia';
import type { ListLinkTokenRepository } from './domain/ports/list-link-token.repository';
import type { ListEmailInviteRepository } from './domain/ports/list-email-invite.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import {
  CreateLinkInviteUseCase,
  ListLinkInvitesUseCase,
  RevokeLinkInviteUseCase,
  GetLinkInviteDetailsUseCase,
} from './application/link-invite.use-cases';
import { CreateEmailInviteUseCase } from './application/create-email-invite.use-case';
import { AcceptLinkInviteUseCase, AcceptEmailInviteUseCase } from './application/accept-invite.use-cases';
import { inviteAcceptRoutes } from './presentation/invites.routes';

export interface InvitesModuleDeps {
  linkTokenRepo: ListLinkTokenRepository;
  emailInviteRepo: ListEmailInviteRepository;
  listShareRepo: ListShareRepository;
  userRepo: UserRepository;
  wishlistRepo: WishlistRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  eventBus: EventBus;
}

export function createInvitesModule(deps: InvitesModuleDeps) {
  const invitesUseCases = {
    createLinkInvite: new CreateLinkInviteUseCase(deps.linkTokenRepo, deps.assertUserCanUseCase),
    listLinkInvites: new ListLinkInvitesUseCase(deps.linkTokenRepo),
    revokeLinkInvite: new RevokeLinkInviteUseCase(deps.linkTokenRepo),
    getLinkInviteDetails: new GetLinkInviteDetailsUseCase(deps.linkTokenRepo),
    createEmailInvite: new CreateEmailInviteUseCase(deps.emailInviteRepo),
    acceptLinkInvite: new AcceptLinkInviteUseCase(
      deps.linkTokenRepo,
      deps.listShareRepo,
      deps.wishlistRepo,
      deps.eventBus
    ),
    acceptEmailInvite: new AcceptEmailInviteUseCase(
      deps.emailInviteRepo,
      deps.listShareRepo,
      deps.userRepo,
      deps.wishlistRepo,
      deps.eventBus
    ),
  };

  return {
    module: new Elysia().use(inviteAcceptRoutes(invitesUseCases)),
    invitesUseCases,
  };
}
