import type { AdminUserRepository } from '../domain/ports/admin-user.repository';

export interface ListAdminUsersQuery {
  search?: string;
  disabled?: string;
  locked?: string;
  admin?: string;
  page?: string | number;
}

export class ListAdminUsersUseCase {
  constructor(private adminUserRepo: AdminUserRepository) {}

  async execute(query: ListAdminUsersQuery) {
    const search = query.search?.trim() ?? '';
    const disabled = query.disabled === 'true' ? true : query.disabled === 'false' ? false : null;
    const locked = query.locked === 'true';
    const adminOnly = query.admin === 'true';
    const page = Math.max(1, Number(query.page) || 1);

    const result = await this.adminUserRepo.list({
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
