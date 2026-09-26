import type { ListRoleLevel } from '../types/list-role-level.type';

export const ROLE_HIERARCHY: Record<ListRoleLevel, number> = {
  viewer: 1,
  collaborator: 2,
  owner: 3,
};
