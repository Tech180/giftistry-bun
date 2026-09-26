import type { ResetPasswordPayload } from '../../slices/users/interfaces/reset-password-payload.interface';
import type { ResetPasswordRequest } from '../interfaces/reset-password-request.interface';

export function mapResetPasswordPayload(raw: ResetPasswordRequest): ResetPasswordPayload {
  return {
    password: raw.Password,
    forcePasswordChange: raw.ForcePasswordChange,
  };
}
