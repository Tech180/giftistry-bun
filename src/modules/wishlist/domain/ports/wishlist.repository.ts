import type { Wishlist, Priority } from '../wishlist.entity';

export interface WishlistRepository {
  findById(id: string): Promise<Wishlist | null>;
  findByUserId(userId: string): Promise<Wishlist[]>;
  create(userId: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean, category?: string, revealSuggestions?: boolean, aiEnabled?: boolean): Promise<Wishlist>;
  updateActive(id: string, isActive: boolean): Promise<void>;
  update(id: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean, category?: string, revealSuggestions?: boolean, aiEnabled?: boolean): Promise<Wishlist>;
  delete(id: string): Promise<void>;
  findExpiredActive(): Promise<Wishlist[]>;
  
  createPriority(userId: string, label: string, weight: number): Promise<Priority>;
  findPrioritiesByUserId(userId: string): Promise<Priority[]>;
  findPrioritiesByWishlistForUser(wishlistId: string, userId: string, isOwner: boolean, hasExpired: boolean, revealSuggestions: boolean): Promise<Priority[]>;
  findPriorityById(id: string): Promise<Priority | null>;
  deletePriority(id: string, userId: string): Promise<void>;
}
