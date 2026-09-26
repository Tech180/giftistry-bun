export interface CreateOauthUserInput {
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  oauthSub: string;
  isAdmin?: boolean;
  isOwner?: boolean;
}
