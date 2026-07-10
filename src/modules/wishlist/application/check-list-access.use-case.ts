import type { ListAccessService } from '../domain/list-access.service';
import type { ListAccessContext } from '../domain/ports/list-access.repository';
import { ListRole, type ListRoleLevel } from '@/common/domain/list-role.vo';
import { AppError } from '@/common/middlewares/error.middleware';

export class CheckListAccessUseCase {
  constructor(private listAccessService: ListAccessService) {}

  async execute(
    userId: string,
    target: { listId?: string; itemId?: string },
    minRole?: ListRoleLevel
  ): Promise<ListAccessContext> {
    const access = await this.listAccessService.resolve(userId, target);

    if (minRole) {
      const role = ListRole.create(access.role);
      if (!role.isAtLeast(minRole)) {
        throw new AppError(`Forbidden: Requires at least ${minRole} role`, 403, 'FORBIDDEN');
      }
    }

    return access;
  }
}
