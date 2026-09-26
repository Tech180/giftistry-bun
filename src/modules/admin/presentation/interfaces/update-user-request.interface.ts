export interface UpdateUserRequest {
  Username?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Bio?: string;
  Avatar?: string | null;
  EmailVerified?: boolean;
}
