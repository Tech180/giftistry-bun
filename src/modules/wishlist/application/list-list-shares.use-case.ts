import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { ListShareWithUser } from '../domain/list-share.entity';

export class ListListSharesUseCase {
  constructor(private listShareRepo: ListShareRepository) {}

  async execute(listId: string): Promise<ListShareWithUser[]> {
    return await this.listShareRepo.findSharesWithUsers(listId);
  }
}
