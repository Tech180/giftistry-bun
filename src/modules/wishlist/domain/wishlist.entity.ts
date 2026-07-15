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
  WebSearchEnabled?: boolean;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerAvatar?: string | null;
  Role?: 'owner' | 'collaborator' | 'viewer';
  Shares?: ListShareWithUser[];
}

export class WishlistEntity implements Wishlist {
  Id!: string;
  UserId!: string;
  Title!: string;
  ExpiresAt!: Date | null;
  AllowGroupFunds!: boolean;
  IsActive!: boolean;
  CreatedAt?: Date;
  Category?: string;
  RevealSuggestions?: boolean;
  AiEnabled?: boolean;
  WebSearchEnabled?: boolean;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerAvatar?: string | null;
  Role?: 'owner' | 'collaborator' | 'viewer';
  Shares?: ListShareWithUser[];

  constructor(data: Wishlist) {
    Object.assign(this, data);
  }

  static from(data: Wishlist): WishlistEntity {
    return new WishlistEntity(data);
  }

  toPlain(): Wishlist {
    return { ...this };
  }

  isOwner(userId: string): boolean {
    return this.UserId === userId;
  }

  isExpired(): boolean {
    return this.ExpiresAt ? new Date() > this.ExpiresAt : false;
  }

  shouldRevealSuggestions(): boolean {
    return this.isExpired() && Boolean(this.RevealSuggestions);
  }

  isAiEnabled(): boolean {
    return Boolean(this.AiEnabled);
  }
}
