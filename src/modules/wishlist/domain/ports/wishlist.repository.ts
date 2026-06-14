import type { Wishlist, Priority } from '../wishlist.entity';

export interface WishlistRepository {
  findById(id: string): Promise<Wishlist | null>;
  findByUserId(userId: string): Promise<Wishlist[]>;
  create(userId: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean): Promise<Wishlist>;
  updateActive(id: string, isActive: boolean): Promise<void>;
  findExpiredActive(): Promise<Wishlist[]>;
  
  createPriority(userId: string, label: string, weight: number): Promise<Priority>;
  findPrioritiesByUserId(userId: string): Promise<Priority[]>;
  findPriorityById(id: string): Promise<Priority | null>;
}
