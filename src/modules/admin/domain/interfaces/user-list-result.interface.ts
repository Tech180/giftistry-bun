import type { UserListItemDto } from './user-list-item-dto.interface';

export interface UserListResult {
  users: UserListItemDto[];
  page: number;
  total: number;
}
