export interface ListUsersQuery {
  search?: string;
  disabled?: string;
  locked?: string;
  admin?: string;
  page?: string | number;
}
