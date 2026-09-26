import { DomainError } from './errors/domain-error';
import { ROLE_HIERARCHY } from './constants/list-role-hierarchy.constant';
import type { ListRoleLevel } from './types/list-role-level.type';

export class ListRole {
  private constructor(readonly level: ListRoleLevel) {}

  static create(level: string): ListRole {
    if (!ROLE_HIERARCHY[level as ListRoleLevel]) {
      throw new DomainError(`Invalid list role: ${level}`);
    }
    return new ListRole(level as ListRoleLevel);
  }

  static viewer(): ListRole {
    return new ListRole('viewer');
  }

  static collaborator(): ListRole {
    return new ListRole('collaborator');
  }

  static owner(): ListRole {
    return new ListRole('owner');
  }

  isAtLeast(required: ListRoleLevel): boolean {
    return ROLE_HIERARCHY[this.level] >= ROLE_HIERARCHY[required];
  }

  toString(): ListRoleLevel {
    return this.level;
  }
}
