export interface UserListFilters {
  search?: string;
  disabled?: boolean | null;
  locked?: boolean;
  adminOnly?: boolean;
  page?: number;
  limit?: number;
}
