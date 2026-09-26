export interface UpdateProfileRequest {
  Username?: string;
  FirstName?: string | null;
  LastName?: string | null;
  Bio?: string | null;
  Theme?: string | null;
  Avatar?: string | null;
  AiEnabled?: boolean;
  WebSearchEnabled?: boolean;
}
