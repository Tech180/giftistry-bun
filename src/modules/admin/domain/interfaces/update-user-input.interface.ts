export interface UpdateUserInput {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string | null;
  emailVerified?: boolean;
}
