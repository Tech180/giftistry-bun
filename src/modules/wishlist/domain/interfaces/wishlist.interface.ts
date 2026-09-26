import type { ListShareWithUser } from './list-share-with-user.interface';
import type { ListRole } from '../types/list-role.type';

export interface Wishlist {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  CreatedAt?: Date;
  Category?: string;
  RevealSuggestions?: boolean;
  AiEnabled?: boolean;
  WebSearchEnabled?: boolean;
  ManualJobBackground?: boolean;
  AutoRollover?: boolean;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerAvatar?: string | null;
  Role?: ListRole;
  Shares?: ListShareWithUser[];
}
