export interface UserProfileState {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  avatar: string | null;
  email_verified: boolean;
  is_owner: boolean;
}
