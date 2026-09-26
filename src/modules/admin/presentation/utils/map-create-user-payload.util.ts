import type { CreateUserPayload } from '../../slices/users/interfaces/create-user-payload.interface';
import type { CreateUserRequest } from '../interfaces/create-user-request.interface';

export function mapCreateUserPayload(raw: CreateUserRequest): CreateUserPayload {
  return {
    username: raw.Username,
    email: raw.Email,
    password: raw.Password,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    isAdmin: raw.IsAdmin,
    emailVerified: raw.EmailVerified,
    forcePasswordChange: raw.ForcePasswordChange,
    policy: raw.Policy,
  };
}
