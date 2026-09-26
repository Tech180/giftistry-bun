import type { AcceptEmailInviteUseCase } from '../../application/use-cases/accept-email-invite.use-case';
import type { AcceptLinkInviteUseCase } from '../../application/use-cases/accept-link-invite.use-case';
import type { CreateEmailInviteUseCase } from '../../application/use-cases/create-email-invite.use-case';
import type { CreateLinkInviteUseCase } from '../../application/use-cases/create-link-invite.use-case';
import type { GetLinkInviteDetailsUseCase } from '../../application/use-cases/get-link-invite-details.use-case';
import type { GetPublicLinkPreviewUseCase } from '../../application/use-cases/get-public-link-preview.use-case';
import type { ListLinkInvitesUseCase } from '../../application/use-cases/list-link-invites.use-case';
import type { RevokeLinkInviteUseCase } from '../../application/use-cases/revoke-link-invite.use-case';

export interface UseCases {
  createLinkInvite: CreateLinkInviteUseCase;
  listLinkInvites: ListLinkInvitesUseCase;
  revokeLinkInvite: RevokeLinkInviteUseCase;
  getLinkInviteDetails: GetLinkInviteDetailsUseCase;
  getPublicLinkPreview: GetPublicLinkPreviewUseCase;
  createEmailInvite: CreateEmailInviteUseCase;
  acceptLinkInvite: AcceptLinkInviteUseCase;
  acceptEmailInvite: AcceptEmailInviteUseCase;
}
