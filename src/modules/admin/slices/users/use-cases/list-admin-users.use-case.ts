import type { UserRepository } from '../../../domain/ports/user.repository';
import type { ListUsersQuery } from '../interfaces/list-users-query.interface';

export class ListAdminUsersUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(query: ListUsersQuery) {
    const search = query.search?.trim() ?? '';
    const disabled = query.disabled === 'true' ? true : query.disabled === 'false' ? false : null;
    const locked = query.locked === 'true';
    const adminOnly = query.admin === 'true';
    const page = Math.max(1, Number(query.page) || 1);

    const result = await this.userRepo.list({
      search,
      disabled,
      locked,
      adminOnly,
      page,
      limit: 25,
    });

    return {
      Users: result.users,
      Page: result.page,
      Total: result.total,
    };
  }
}
