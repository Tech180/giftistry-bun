import type { ListLinkTokenPublic } from '../../domain/interfaces/list-link-token-public.interface';

export interface CreateLinkInviteResult {
  invite: ListLinkTokenPublic;
  token: string;
}
