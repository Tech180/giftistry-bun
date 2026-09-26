import { Elysia } from 'elysia';
import { AcceptEmailInviteUseCase } from './application/use-cases/accept-email-invite.use-case';
import { AcceptLinkInviteUseCase } from './application/use-cases/accept-link-invite.use-case';
import { CreateEmailInviteUseCase } from './application/use-cases/create-email-invite.use-case';
import { CreateLinkInviteUseCase } from './application/use-cases/create-link-invite.use-case';
import { GetLinkInviteDetailsUseCase } from './application/use-cases/get-link-invite-details.use-case';
import { GetPublicLinkPreviewUseCase } from './application/use-cases/get-public-link-preview.use-case';
import { ListLinkInvitesUseCase } from './application/use-cases/list-link-invites.use-case';
import { RevokeLinkInviteUseCase } from './application/use-cases/revoke-link-invite.use-case';
import type { InvitesModuleDeps } from './interfaces/invites-module-deps.interface';
import { invitesRoutes } from './presentation/invites.routes';

export function createInvitesModule(deps: InvitesModuleDeps) {
  const useCases = {
    createLinkInvite: new CreateLinkInviteUseCase(deps.linkTokenRepo, deps.assertUserCanUseCase),
    listLinkInvites: new ListLinkInvitesUseCase(deps.linkTokenRepo),
    revokeLinkInvite: new RevokeLinkInviteUseCase(deps.linkTokenRepo, deps.guestRealtime ?? null),
    getLinkInviteDetails: new GetLinkInviteDetailsUseCase(deps.linkTokenRepo),
    getPublicLinkPreview: new GetPublicLinkPreviewUseCase(
      deps.linkTokenRepo,
      deps.wishlistRepo,
      deps.listItems
    ),
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
    module: new Elysia().use(invitesRoutes({ useCases })),
    invitesUseCases: useCases,
  };
}
