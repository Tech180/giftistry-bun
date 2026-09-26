import type { ListShareWithUser } from './interfaces/list-share-with-user.interface';
import type { ListRole } from './types/list-role.type';
import type { Wishlist } from './interfaces/wishlist.interface';

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
  ManualJobBackground?: boolean;
  AutoRollover?: boolean;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerAvatar?: string | null;
  Role?: ListRole;
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

  isAiEnabled(): boolean {
    return Boolean(this.AiEnabled);
  }
}
