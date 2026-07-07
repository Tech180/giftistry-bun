import type { ListShareWithUser } from './list-share.entity';

export interface Priority {
  Id: string;
  UserId: string;
  Label: string;
  Weight: number;
}

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
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerAvatar?: string | null;
  Role?: 'owner' | 'collaborator' | 'viewer';
  Shares?: ListShareWithUser[];
}
