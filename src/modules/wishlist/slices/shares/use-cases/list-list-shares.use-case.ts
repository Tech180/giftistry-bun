import type { ListShareRepository } from '../../../domain/ports/list-share.repository';
import type { ListShareWithUser } from '../../../domain/interfaces/list-share-with-user.interface';

export class ListListSharesUseCase {
  constructor(private listShareRepo: ListShareRepository) {}

  async execute(listId: string): Promise<ListShareWithUser[]> {
    return await this.listShareRepo.findSharesWithUsers(listId);
  }
}
