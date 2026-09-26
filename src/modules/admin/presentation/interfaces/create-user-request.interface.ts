export interface CreateUserRequest {
  Username: string;
  Email?: string;
  Password: string;
  FirstName?: string;
  LastName?: string;
  IsAdmin?: boolean;
  EmailVerified?: boolean;
  ForcePasswordChange?: boolean;
  Policy?: Record<string, unknown>;
}
