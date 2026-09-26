export interface CreateAdminUserParams {
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  authHash: string;
}
