import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';

export interface ListAccessContext {
  listId: string;
  role: ListRoleLevel;
  isExpired: boolean;
  isActive: boolean;
}
