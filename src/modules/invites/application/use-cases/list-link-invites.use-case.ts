import type { ListLinkTokenPublic } from '../../domain/interfaces/list-link-token-public.interface';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';

export class ListLinkInvitesUseCase {
  constructor(private linkTokenRepo: ListLinkTokenRepository) {}

  async execute(listId: string): Promise<ListLinkTokenPublic[]> {
    return await this.linkTokenRepo.findByListId(listId);
  }
}
