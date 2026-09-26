import type { ListEmailInvite } from '../../domain/interfaces/list-email-invite.interface';

export interface CreateEmailInviteResult {
  invite: ListEmailInvite;
  token: string;
}
