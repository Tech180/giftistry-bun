import type { UpdateProfileRequest } from '../interfaces/update-profile-request.interface';

export function mapUpdateProfilePayload(raw: UpdateProfileRequest) {
  return {
    username: raw.Username,
    firstName: raw.FirstName ?? undefined,
    lastName: raw.LastName ?? undefined,
    bio: raw.Bio ?? undefined,
    theme: raw.Theme ?? undefined,
    avatar: raw.Avatar !== undefined ? raw.Avatar : undefined,
    aiEnabled: raw.AiEnabled,
    webSearchEnabled: raw.WebSearchEnabled,
  };
}
