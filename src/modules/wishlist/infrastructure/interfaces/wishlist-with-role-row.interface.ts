import type { ListRole } from '../../domain/types/list-role.type';

export interface WishlistWithRoleRow {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | string | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  CreatedAt: Date | string;
  Category: string | null;
  RevealSuggestions: boolean;
  AiEnabled: boolean;
  WebSearchEnabled: boolean;
  ManualJobBackground: boolean;
  AutoRollover: boolean;
  OwnerUsername: string | null;
  OwnerFirstName: string | null;
  OwnerAvatar: string | null;
  Role: ListRole;
}
