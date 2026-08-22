import type { CreateLinkInviteUseCase, ListLinkInvitesUseCase, RevokeLinkInviteUseCase, GetLinkInviteDetailsUseCase } from '../application/link-invite.use-cases';
import type { CreateEmailInviteUseCase } from '../application/create-email-invite.use-case';
import type { AcceptLinkInviteUseCase, AcceptEmailInviteUseCase } from '../application/accept-invite.use-cases';
import type { GetPublicLinkPreviewUseCase } from '../application/get-public-link-preview.use-case';

export interface InvitesUseCases {
  createLinkInvite: CreateLinkInviteUseCase;
  listLinkInvites: ListLinkInvitesUseCase;
  revokeLinkInvite: RevokeLinkInviteUseCase;
  getLinkInviteDetails: GetLinkInviteDetailsUseCase;
  getPublicLinkPreview: GetPublicLinkPreviewUseCase;
  createEmailInvite: CreateEmailInviteUseCase;
  acceptLinkInvite: AcceptLinkInviteUseCase;
  acceptEmailInvite: AcceptEmailInviteUseCase;
}
