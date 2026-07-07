import { Elysia } from 'elysia';
import { PostgresListLinkTokenRepository } from './infrastructure/postgres-list-link-token.repository';
import { PostgresListEmailInviteRepository } from './infrastructure/postgres-list-email-invite.repository';
import { PostgresListShareRepository } from '@/modules/wishlist/infrastructure/postgres-list-share.repository';
import { sharedPostgresUserRepository } from '@/modules/auth/auth.module';
import { CreateLinkInviteUseCase, ListLinkInvitesUseCase, RevokeLinkInviteUseCase, GetLinkInviteDetailsUseCase } from './application/link-invite.use-cases';
import { CreateEmailInviteUseCase } from './application/create-email-invite.use-case';
import { AcceptLinkInviteUseCase, AcceptEmailInviteUseCase } from './application/accept-invite.use-cases';
import { inviteAcceptRoutes } from './presentation/invites.routes';

const linkTokenRepo = new PostgresListLinkTokenRepository();
const emailInviteRepo = new PostgresListEmailInviteRepository();
const listShareRepo = new PostgresListShareRepository();

const invitesUseCases = {
  createLinkInvite: new CreateLinkInviteUseCase(linkTokenRepo),
  listLinkInvites: new ListLinkInvitesUseCase(linkTokenRepo),
  revokeLinkInvite: new RevokeLinkInviteUseCase(linkTokenRepo),
  getLinkInviteDetails: new GetLinkInviteDetailsUseCase(linkTokenRepo),
  createEmailInvite: new CreateEmailInviteUseCase(emailInviteRepo),
  acceptLinkInvite: new AcceptLinkInviteUseCase(linkTokenRepo, listShareRepo),
  acceptEmailInvite: new AcceptEmailInviteUseCase(emailInviteRepo, listShareRepo, sharedPostgresUserRepository),
};

export const invitesModule = new Elysia()
  .use(inviteAcceptRoutes(invitesUseCases));

export { invitesUseCases };
