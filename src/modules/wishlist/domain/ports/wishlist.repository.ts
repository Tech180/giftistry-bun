import type { Wishlist, Priority } from '../wishlist.entity';

export interface WishlistRepository {
  findById(id: string): Promise<Wishlist | null>;
  findByUserId(userId: string): Promise<Wishlist[]>;
  create(userId: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean, category?: string, revealSuggestions?: boolean, aiEnabled?: boolean, webSearchEnabled?: boolean, manualJobBackground?: boolean, autoRollover?: boolean): Promise<Wishlist>;
  updateActive(id: string, isActive: boolean): Promise<void>;
  updateExpiresAt(id: string, expiresAt: Date | null): Promise<void>;
  /** Sets is_active = true; optionally clears expires_at in the same transaction. */
  reactivateWishlist(id: string, clearExpiresAt: boolean): Promise<void>;
  update(id: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean, category?: string, revealSuggestions?: boolean, aiEnabled?: boolean, webSearchEnabled?: boolean, manualJobBackground?: boolean, autoRollover?: boolean): Promise<Wishlist>;
  delete(id: string): Promise<void>;
  findExpiredActive(): Promise<Wishlist[]>;
  
  createPriority(userId: string, label: string, weight: number): Promise<Priority>;
  findPrioritiesByUserId(userId: string): Promise<Priority[]>;
  findPrioritiesByWishlistForUser(wishlistId: string, userId: string, isOwner: boolean): Promise<Priority[]>;
  findPriorityById(id: string): Promise<Priority | null>;
  deletePriority(id: string, userId: string): Promise<void>;
  countListsByUser(userId: string): Promise<{ active: number; archived: number }>;
}
