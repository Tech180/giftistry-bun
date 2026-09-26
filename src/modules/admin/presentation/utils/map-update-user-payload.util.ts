import type { UpdateUserPayload } from '../../slices/users/interfaces/update-user-payload.interface';
import type { UpdateUserRequest } from '../interfaces/update-user-request.interface';

export function mapUpdateUserPayload(raw: UpdateUserRequest): UpdateUserPayload {
  return {
    username: raw.Username,
    email: raw.Email,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    bio: raw.Bio,
    avatar: raw.Avatar,
    emailVerified: raw.EmailVerified,
  };
}
